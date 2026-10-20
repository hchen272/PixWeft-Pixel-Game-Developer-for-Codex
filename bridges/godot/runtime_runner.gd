extends SceneTree
## Executes a bounded input/observation sequence in an isolated game process.

const Protocol = preload("protocol.gd")
var _pressed_actions: Dictionary = {}
var _elapsed_frames: int = 0

func _init() -> void:
	call_deferred("_run")

func _run() -> void:
	var paths = OS.get_cmdline_user_args()
	if paths.size() != 2:
		printerr("Usage: --script runtime_runner.gd -- request.json response.json")
		quit(2)
		return
	var request = Protocol.read_request(paths[0])
	var args: Dictionary = request.get("args", {})
	var results: Array = []
	if Protocol.failure.is_empty() and request.get("operation") != "runtime_sequence":
		Protocol.fail("Expected runtime_sequence operation")
	var scene_path = str(args.get("scene_path", ProjectSettings.get_setting("application/run/main_scene", "")))
	if scene_path.begins_with("uid://"):
		scene_path = ResourceUID.get_id_path(ResourceUID.text_to_id(scene_path))
	if Protocol.failure.is_empty():
		scene_path = Protocol.resource_path(scene_path)
	if Protocol.failure.is_empty():
		var error = change_scene_to_file(scene_path)
		if error != OK: Protocol.fail("Unable to start scene: " + error_string(error))
	if Protocol.failure.is_empty():
		await _wait_frames(int(args.get("frames_before", 2)))
	if not args.get("steps", []) is Array:
		Protocol.fail("steps must be an array")
	var steps: Array = args.get("steps", []) if args.get("steps", []) is Array else []
	if steps.size() > 256: Protocol.fail("Runtime sequence exceeds 256 steps")
	for index in steps.size():
		if not Protocol.failure.is_empty(): break
		var step = steps[index]
		if not step is Dictionary:
			Protocol.fail("Each runtime step must be an object")
			break
		var result: Dictionary = {"index": index, "type": str(step.get("type", ""))}
		match str(step.get("type", "")):
			"wait":
				await _wait_frames(int(step.get("frames", 1)))
				result["elapsed_frames"] = _elapsed_frames
			"input":
				result.merge(_action_input(step))
				await _wait_frames(int(step.get("frames", 1)))
			"key":
				result.merge(_key_input(step))
				await _wait_frames(int(step.get("frames", 1)))
			"mouse_button":
				result.merge(_mouse_input(step))
				await _wait_frames(int(step.get("frames", 1)))
			"inspect":
				result["data"] = _inspect(step)
			"capture":
				result["data"] = await _capture(step)
			_:
				Protocol.fail("Unsupported runtime step: " + str(step.get("type", "")))
		results.append(result)
	for action in _pressed_actions:
		Input.action_release(action)
	var data = {"scene_path": scene_path, "display_driver": DisplayServer.get_name(), "elapsed_frames": _elapsed_frames, "steps": results, "note": "Observations are returned without game-specific success assertions."}
	Protocol.write_response(paths[1], request, data)
	quit(0 if Protocol.failure.is_empty() else 1)

func _wait_frames(count: int) -> void:
	if count < 0 or count > 3600 or _elapsed_frames + count > 7200:
		Protocol.fail("Frame budget exceeded (0..3600 per step, 7200 total)")
		return
	for _index in count:
		await physics_frame
		await process_frame
		_elapsed_frames += 1

func _action_input(step: Dictionary) -> Dictionary:
	var action = str(step.get("action", ""))
	if not InputMap.has_action(action):
		Protocol.fail("Input action does not exist: " + action)
		return {}
	var pressed = bool(step.get("pressed", true))
	var event = InputEventAction.new()
	event.action = action
	event.pressed = pressed
	event.strength = clampf(float(step.get("strength", 1.0)), 0.0, 1.0) if pressed else 0.0
	Input.parse_input_event(event)
	if pressed: _pressed_actions[action] = true
	else: _pressed_actions.erase(action)
	return {"action": action, "pressed": pressed}

func _key_input(step: Dictionary) -> Dictionary:
	var code = int(step.get("keycode", 0))
	if code <= 0:
		Protocol.fail("keycode must be a positive Godot Key enum value")
		return {}
	var event = InputEventKey.new()
	event.keycode = code
	event.physical_keycode = int(step.get("physical_keycode", code))
	event.pressed = bool(step.get("pressed", true))
	event.shift_pressed = bool(step.get("shift", false))
	event.ctrl_pressed = bool(step.get("ctrl", false))
	event.alt_pressed = bool(step.get("alt", false))
	Input.parse_input_event(event)
	return {"keycode": code, "pressed": event.pressed}

func _mouse_input(step: Dictionary) -> Dictionary:
	var point = step.get("position", [])
	var button = int(step.get("button", MOUSE_BUTTON_LEFT))
	if not point is Array or point.size() != 2 or button < 1 or button > 9:
		Protocol.fail("mouse_button requires position:[x,y] and button 1..9")
		return {}
	var event = InputEventMouseButton.new()
	event.position = Vector2(float(point[0]), float(point[1]))
	event.global_position = event.position
	event.button_index = button
	event.pressed = bool(step.get("pressed", true))
	# Viewport coordinates are explicit and do not depend on desktop focus.
	root.push_input(event)
	return {"position": event.position, "button": button, "pressed": event.pressed}

func _inspect(step: Dictionary) -> Dictionary:
	if current_scene == null:
		Protocol.fail("There is no current scene to inspect")
		return {}
	var path = str(step.get("node_path", "."))
	if path.begins_with("/") or path.split("/").has(".."):
		Protocol.fail("node_path must stay within the current scene")
		return {}
	var node = current_scene.get_node_or_null(NodePath(path))
	if node == null:
		Protocol.fail("Runtime node does not exist: " + path)
		return {}
	var names = step.get("properties", [])
	if not names is Array:
		Protocol.fail("properties must be an array of property names")
		return {}
	var children: Array = []
	for child in node.get_children(): children.append({"name": child.name, "type": child.get_class()})
	return {"node_path": path, "name": node.name, "type": node.get_class(), "properties": Protocol.properties(node, names), "children": children}

func _capture(step: Dictionary) -> Dictionary:
	if DisplayServer.get_name() == "headless":
		Protocol.fail("Capture requires a rendered process; rerun with headless=false")
		return {}
	var path = Protocol.project_path(step.get("output_path", ""))
	if not Protocol.failure.is_empty() or path.is_empty(): return {}
	if not path.to_lower().ends_with(".png"):
		Protocol.fail("Capture output_path must end with .png")
		return {}
	var error = DirAccess.make_dir_recursive_absolute(path.get_base_dir())
	if error != OK:
		Protocol.fail("Unable to create capture directory: " + error_string(error))
		return {}
	await process_frame
	await RenderingServer.frame_post_draw
	var image = root.get_texture().get_image()
	if image == null or image.is_empty():
		Protocol.fail("Rendered viewport returned no image")
		return {}
	error = image.save_png(path)
	if error != OK:
		Protocol.fail("Unable to save capture: " + error_string(error))
		return {}
	return {"path": path, "width": image.get_width(), "height": image.get_height(), "file_sha256": FileAccess.get_sha256(path)}
