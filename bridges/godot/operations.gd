extends SceneTree
## Bounded headless scene/resource adapter. Run only against trusted projects.

const Protocol = preload("protocol.gd")
var _created_count: int = 0

func _init() -> void:
	call_deferred("_run")

func _run() -> void:
	var paths = OS.get_cmdline_user_args()
	if paths.size() != 2:
		printerr("Usage: --script operations.gd -- request.json response.json")
		quit(2)
		return
	var request = Protocol.read_request(paths[0])
	var data: Variant = null
	if Protocol.failure.is_empty():
		var args: Dictionary = request.get("args", {})
		match str(request.get("operation", "")):
			"project_inspect": data = _project_inspect()
			"scene_inspect": data = _scene_inspect(args)
			"scene_create": data = _scene_create(args)
			"scene_set_properties": data = _scene_set_properties(args)
			"resource_inspect": data = _resource_inspect(args)
			"image_inspect": data = _image_inspect(args)
			"project_set_settings": data = _project_set_settings(args)
			_: Protocol.fail("Unknown operation: " + str(request.get("operation", "")))
	Protocol.write_response(paths[1], request, data)
	quit(0 if Protocol.failure.is_empty() else 1)

func _project_inspect() -> Dictionary:
	return {"project_root": ProjectSettings.globalize_path("res://"), "name": ProjectSettings.get_setting("application/config/name", ""), "main_scene": ProjectSettings.get_setting("application/run/main_scene", ""), "viewport_size": Vector2i(ProjectSettings.get_setting("display/window/size/viewport_width", 1152), ProjectSettings.get_setting("display/window/size/viewport_height", 648)), "rendering_method": ProjectSettings.get_setting("rendering/renderer/rendering_method", "gl_compatibility"), "input_actions": InputMap.get_actions()}

func _load_scene(value: Variant) -> PackedScene:
	var path = Protocol.resource_path(value)
	if path.is_empty(): return null
	if not ResourceLoader.exists(path):
		Protocol.fail("Scene does not exist: " + path)
		return null
	var scene = load(path)
	if not scene is PackedScene:
		Protocol.fail("Resource is not a PackedScene: " + path)
		return null
	return scene

func _scene_inspect(args: Dictionary) -> Dictionary:
	var scene = _load_scene(args.get("scene_path", ""))
	if scene == null: return {}
	# Serialized inspection does not instantiate project scripts.
	var state = scene.get_state()
	var nodes: Array = []
	var names: Array = args.get("properties", [])
	var max_depth = clampi(int(args.get("max_depth", 16)), 0, 64)
	for index in state.get_node_count():
		var path = str(state.get_node_path(index))
		if path.split("/").size() > max_depth + 1: continue
		var properties: Dictionary = {}
		for property_index in state.get_node_property_count(index):
			var property_name = str(state.get_node_property_name(index, property_index))
			if names.is_empty() or property_name in names:
				properties[property_name] = Protocol.encode(state.get_node_property_value(index, property_index))
		var row = {"path": path, "name": state.get_node_name(index), "type": state.get_node_type(index), "properties": properties}
		var instance = state.get_node_instance(index)
		if instance != null: row["instance_scene"] = instance.resource_path
		nodes.append(row)
	return {"scene_path": scene.resource_path, "nodes": nodes, "inspection": "serialized_scene_state", "note": "Default properties and runtime-created nodes require runtime inspection."}

func _make_node(spec: Dictionary, owner_root: Node = null, depth: int = 0) -> Node:
	_created_count += 1
	if depth > 32 or _created_count > 1000:
		Protocol.fail("Scene creation exceeds node/depth limits")
		return null
	var type = str(spec.get("type", "Node2D"))
	if not ClassDB.class_exists(type) or not ClassDB.can_instantiate(type) or not ClassDB.is_parent_class(type, "Node"):
		Protocol.fail("Expected an instantiable native Node class: " + type)
		return null
	var node = ClassDB.instantiate(type) as Node
	var node_name = str(spec.get("name", type))
	if node_name.is_empty() or node_name.validate_node_name() != node_name:
		Protocol.fail("Invalid node name: " + node_name)
		node.free()
		return null
	node.name = node_name
	if not spec.get("properties", {}) is Dictionary or not Protocol.set_properties(node, spec.get("properties", {})):
		if Protocol.failure.is_empty(): Protocol.fail("Node properties must be an object")
		node.free()
		return null
	if owner_root == null: owner_root = node
	if not spec.get("children", []) is Array:
		Protocol.fail("Node children must be an array")
		node.free()
		return null
	for child_spec in spec.get("children", []):
		if not child_spec is Dictionary:
			Protocol.fail("Child specification must be an object")
			node.free()
			return null
		var child = _make_node(child_spec, owner_root, depth + 1)
		if child == null:
			node.free()
			return null
		if node.get_node_or_null(NodePath(str(child.name))) != null:
			Protocol.fail("Duplicate sibling node name: " + str(child.name))
			child.free()
			node.free()
			return null
		node.add_child(child)
	return node

func _assign_owner(node: Node, owner_root: Node) -> void:
	node.owner = owner_root
	for child in node.get_children(): _assign_owner(child, owner_root)

func _save_scene(node: Node, path: String) -> Dictionary:
	var packed = PackedScene.new()
	var error = packed.pack(node)
	if error == OK: error = DirAccess.make_dir_recursive_absolute(ProjectSettings.globalize_path(path.get_base_dir()))
	if error == OK: error = ResourceSaver.save(packed, path)
	node.free()
	if error != OK:
		Protocol.fail("Unable to save scene: " + error_string(error))
		return {}
	return {"scene_path": path, "saved": true}

func _scene_create(args: Dictionary) -> Dictionary:
	var path = Protocol.resource_path(args.get("scene_path", ""))
	if path.is_empty(): return {}
	if not path.ends_with(".tscn"):
		Protocol.fail("scene_path must end with .tscn")
		return {}
	if FileAccess.file_exists(path) and not bool(args.get("overwrite", false)):
		Protocol.fail("Scene exists; set overwrite=true explicitly")
		return {}
	if not args.get("root") is Dictionary:
		Protocol.fail("root must be a node specification")
		return {}
	var node = _make_node(args.root)
	if node == null: return {}
	for child in node.get_children(): _assign_owner(child, node)
	return _save_scene(node, path)

func _scene_set_properties(args: Dictionary) -> Dictionary:
	var scene = _load_scene(args.get("scene_path", ""))
	if scene == null: return {}
	if not args.get("properties", {}) is Dictionary:
		Protocol.fail("properties must be an object")
		return {}
	# Instantiation can execute project-defined initialization code.
	var root_node = scene.instantiate(PackedScene.GEN_EDIT_STATE_DISABLED)
	var node_path = str(args.get("node_path", "."))
	if node_path.begins_with("/") or node_path.split("/").has(".."):
		Protocol.fail("node_path must stay within the scene")
		root_node.free()
		return {}
	var node = root_node.get_node_or_null(NodePath(node_path))
	if node == null:
		Protocol.fail("Node does not exist: " + node_path)
		root_node.free()
		return {}
	if not Protocol.set_properties(node, args.get("properties", {})):
		root_node.free()
		return {}
	return _save_scene(root_node, scene.resource_path)

func _resource_inspect(args: Dictionary) -> Dictionary:
	var path = Protocol.resource_path(args.get("resource_path", ""))
	if path.is_empty(): return {}
	if not ResourceLoader.exists(path):
		Protocol.fail("Resource does not exist: " + path)
		return {}
	var resource = load(path)
	if resource == null:
		Protocol.fail("Resource could not be loaded: " + path)
		return {}
	var result = {"resource_path": path, "class": resource.get_class(), "properties": Protocol.properties(resource, args.get("properties", []))}
	if resource is Texture2D: result["size"] = resource.get_size()
	return result

func _image_inspect(args: Dictionary) -> Dictionary:
	var path = Protocol.project_path(args.get("resource_path", args.get("path", "")))
	if path.is_empty() or not Protocol.failure.is_empty(): return {}
	var image = Image.load_from_file(path)
	if image == null or image.is_empty():
		Protocol.fail("Image could not be decoded: " + path)
		return {}
	if image.get_width() * image.get_height() > 16777216:
		Protocol.fail("Image exceeds the 16-megapixel inspection budget")
		return {}
	image.convert(Image.FORMAT_RGBA8)
	var pixels = image.get_data()
	var colors: Dictionary = {}
	var opaque = 0
	var transparent = 0
	var partial = 0
	for index in range(0, pixels.size(), 4):
		var key = "%02x%02x%02x%02x" % [pixels[index], pixels[index + 1], pixels[index + 2], pixels[index + 3]]
		colors[key] = int(colors.get(key, 0)) + 1
		if pixels[index + 3] == 0: transparent += 1
		elif pixels[index + 3] == 255: opaque += 1
		else: partial += 1
	var palette: Array = []
	var keys = colors.keys()
	keys.sort()
	for key in keys.slice(0, 256): palette.append({"rgba": "#" + key, "pixels": colors[key]})
	var hash = HashingContext.new()
	hash.start(HashingContext.HASH_SHA256)
	hash.update(pixels)
	var result = {"path": path, "width": image.get_width(), "height": image.get_height(), "format": "RGBA8", "unique_rgba_colors": colors.size(), "opaque_pixels": opaque, "transparent_pixels": transparent, "partial_alpha_pixels": partial, "palette_sample": palette, "palette_truncated": colors.size() > 256, "visible_bounds": image.get_used_rect(), "file_sha256": FileAccess.get_sha256(path), "pixel_rgba8_sha256": hash.finish().hex_encode()}
	var constraints: Dictionary = args.get("constraints", {})
	var checks: Array = []
	for key in ["width", "height", "max_colors", "max_partial_alpha_pixels"]:
		if constraints.has(key):
			var actual: int = {"width": image.get_width(), "height": image.get_height(), "max_colors": colors.size(), "max_partial_alpha_pixels": partial}[key]
			checks.append({"constraint": key, "expected": constraints[key], "actual": actual, "passed": actual <= int(constraints[key]) if key.begins_with("max_") else actual == int(constraints[key])})
	result["checks"] = checks
	var frame_rects = args.get("frame_rects", [])
	if not frame_rects is Array or frame_rects.size() > 512:
		Protocol.fail("frame_rects must be an array of at most 512 named rectangles")
		return {}
	var frames: Array = []
	for spec in frame_rects:
		if not spec is Dictionary or not spec.get("rect") is Array or spec.rect.size() != 4:
			Protocol.fail("Each frame requires rect:[x,y,width,height]")
			return {}
		var values: Array = spec.rect
		var rect = Rect2i(int(values[0]), int(values[1]), int(values[2]), int(values[3]))
		if rect.size.x <= 0 or rect.size.y <= 0 or not Rect2i(0, 0, image.get_width(), image.get_height()).encloses(rect):
			Protocol.fail("Frame rectangle must stay within the image")
			return {}
		var used = image.get_region(rect).get_used_rect()
		frames.append({"name": str(spec.get("name", frames.size())), "rect": [rect.position.x, rect.position.y, rect.size.x, rect.size.y], "visible_bounds_in_frame": [used.position.x, used.position.y, used.size.x, used.size.y], "empty": used.size == Vector2i.ZERO})
	result["frames"] = frames
	result["note"] = "Measurements are evidence; they do not establish visual completeness or pixel-art quality."
	return result

func _project_set_settings(args: Dictionary) -> Dictionary:
	if not args.get("settings") is Dictionary:
		Protocol.fail("settings must be an object")
		return {}
	var settings: Dictionary = args.settings
	var decoded: Dictionary = {}
	for key in settings:
		if not str(key).contains("/") or str(key).begins_with("autoload/"):
			Protocol.fail("Invalid or protected project setting: " + str(key))
			return {}
		decoded[key] = Protocol.decode(settings[key])
	if not Protocol.failure.is_empty(): return {}
	for key in decoded: ProjectSettings.set_setting(str(key), decoded[key])
	var error = ProjectSettings.save()
	if error != OK: Protocol.fail("Unable to save project settings: " + error_string(error))
	return {"saved": error == OK, "settings": decoded}
