## Bounded API 8 operations; no eval, arbitrary script execution, or global palette writes.
extends RefCounted

const MAX_PIXELS := 16777216
const GUARDED := ["document.save", "document.export_png", "document.export_sheet", "document.patch_pixels", "document.add_frame", "document.add_layer", "document.palette", "document.set_animation_fps"]
var _api: Node
var _roots: Array[String] = []
var _states: Dictionary = {}
var _cache: Dictionary = {}
var _cache_keys: Array[String] = []
var _cache_bytes := 0
var _session := str(Time.get_ticks_usec())

func initialize(api: Node, roots: Array) -> void:
	_api = api
	for item in roots:
		var path := str(item).replace("\\", "/").simplify_path().trim_suffix("/")
		if path.is_absolute_path() and not path.begins_with("res:") and not path.begins_with("user:"):
			_roots.append(path)

func app_info() -> Dictionary:
	return {"bridge": "pixel-game", "bridge_version": "0.1.0", "pixelorama_version": _api.general.get_pixelorama_version(), "api_version": _api.get_api_version(), "engine": Engine.get_version_info().string, "operations": ["app.info", "document.info", "document.create", "document.open_image", "document.import_sheet", "document.open_project", "document.save", "document.export_png", "document.export_sheet", "document.preview", "document.patch_pixels", "document.add_frame", "document.add_layer", "document.palette", "document.set_animation_fps"]}

func execute(request: Dictionary) -> Dictionary:
	var id := str(request.get("request_id", ""))
	var operation := str(request.get("operation", ""))
	if id.is_empty() or id.length() > 128:
		return _error("INVALID_REQUEST", "request_id must contain 1 to 128 characters.")
	var signature := JSON.stringify(request).sha256_text()
	if _cache.has(id):
		if _cache[id].signature != signature:
			return _envelope(request, _error("REQUEST_ID_CONFLICT", "This request_id already belongs to a different command."))
		return _cache[id].response
	if not request.get("args", {}) is Dictionary:
		return _envelope(request, _error("INVALID_ARGS", "args must be an object."))
	var args: Dictionary = request.get("args", {})
	var project_root := str(request.get("project_root", ""))
	if operation != "app.info" and not _allowed_root(project_root):
		return _envelope(request, _error("PATH_DENIED", "project_root must be an absolute directory within a configured allowed root."))
	var project: Variant = _api.project.current_project
	if GUARDED.has(operation):
		if project == null:
			return _envelope(request, _error("NO_DOCUMENT", "There is no active document."))
		var state := _document_info(project)
		if str(request.get("document_id", "")) != state.id:
			return _envelope(request, _error("DOCUMENT_CONFLICT", "The active document differs from document_id.", {"document": state}))
		if not _integer(request.get("expected_revision")) or int(request.expected_revision) != state.revision:
			return _envelope(request, _error("REVISION_CONFLICT", "Read document.info and use its current revision.", {"document": state}))
	var result := _dispatch(operation, args, project_root, project)
	if result.get("ok", false) and _api.project.current_project != null:
		result.data["document"] = _document_info(_api.project.current_project)
	var response := _envelope(request, result)
	var response_bytes := JSON.stringify(response).length()
	_cache[id] = {"signature": signature, "response": response, "bytes": response_bytes}
	_cache_bytes += response_bytes
	_cache_keys.append(id)
	while _cache_keys.size() > 128 or (_cache_bytes > 33554432 and _cache_keys.size() > 1):
		var oldest: String = _cache_keys.pop_front()
		_cache_bytes -= int(_cache[oldest].bytes)
		_cache.erase(oldest)
	return response

func _dispatch(operation: String, args: Dictionary, root: String, project: Variant) -> Dictionary:
	match operation:
		"app.info":
			return _ok(app_info())
		"document.import_sheet":
			return _import_sheet(args, root)
		"document.create":
			if not _integer(args.get("width")) or not _integer(args.get("height")):
				return _error("INVALID_ARGS", "width and height must be integers.")
			var width := int(args.width)
			var height := int(args.height)
			if width <= 0 or height <= 0 or width > MAX_PIXELS or height > MAX_PIXELS or width * height > MAX_PIXELS:
				return _error("INVALID_ARGS", "Canvas dimensions must be positive and no larger than 16,777,216 pixels in total.")
			var frame_script: Script = load("res://src/Classes/Frame.gd")
			var frames := Array([], TYPE_OBJECT, "RefCounted", frame_script)
			var created: Variant = _api.project.new_project(frames, str(args.get("name", "Untitled")), Vector2(width, height), Color.TRANSPARENT)
			if created == null:
				return _error("CREATE_FAILED", "Pixelorama did not create the document.")
			_api.project.current_project = created
			return _ok({})
		"document.open_image", "document.open_project":
			var path_result := _checked_path(str(args.get("path", "")), root, false)
			if not path_result.ok:
				return path_result
			var before: Variant = _api.project.current_project
			if operation == "document.open_image":
				var image := Image.load_from_file(path_result.data.path)
				if image == null or image.is_empty() or image.get_width() * image.get_height() > MAX_PIXELS:
					return _error("IMPORT_FAILED", "Image could not be loaded or exceeds the canvas limit.")
				_api.import.open_save_autoload().open_image_as_new_tab(path_result.data.path, image)
			else:
				if path_result.data.path.get_extension().to_lower() != "pxo":
					return _error("INVALID_ARGS", "open_project requires a .pxo file.")
				# Always create a tab: the native default reuses an empty project,
				# which would defeat identity-based success and document guards.
				_api.import.open_save_autoload().open_pxo_file(path_result.data.path, false, false)
			if _api.project.current_project == before:
				return _error("IMPORT_FAILED", "Pixelorama did not open a new document.")
			return _ok({"path": path_result.data.path})
	if project == null:
		return _error("NO_DOCUMENT", "There is no active document.")
	match operation:
		"document.info":
			return _ok({})
		"document.set_animation_fps":
			var fps: Variant = args.get("fps")
			if not (fps is int or fps is float) or not is_finite(float(fps)) or float(fps) < 1.0 or float(fps) > 120.0:
				return _error("INVALID_ARGS", "fps must be a finite number from 1 to 120.")
			project.fps = float(fps)
			if not is_equal_approx(float(project.fps), float(fps)):
				return _error("EDIT_NOT_EXACT", "Pixelorama did not retain the requested animation FPS.", {"document": _document_info(project)})
			return _ok({"fps": float(project.fps)})
		"document.save":
			var checked := _checked_path(str(args.get("path", "")), root, true)
			if not checked.ok:
				return checked
			var path: String = checked.data.path
			if path.get_extension().to_lower() != "pxo":
				return _error("INVALID_ARGS", "Editable documents must use the .pxo extension.")
			var saved: bool = _api.import.open_save_autoload().save_pxo_file(path, false, true, project)
			var reader := ZIPReader.new()
			if not saved or reader.open(path) != OK:
				return _error("SAVE_FAILED", "Pixelorama did not save a readable .pxo archive.")
			var valid := reader.file_exists("data.json") and reader.file_exists("mimetype")
			reader.close()
			if not valid:
				return _error("SAVE_FAILED", "Saved .pxo archive is missing required entries.")
			return _ok({"path": path, "sha256": FileAccess.get_sha256(path)})
		"document.preview", "document.export_png", "document.export_sheet":
			return _image_operation(operation, args, root, project)
		"document.patch_pixels":
			var indices := _indices(args, project)
			if not indices.ok:
				return indices
			var frame: int = indices.data.frame
			var layer: int = indices.data.layer
			var cel: Variant = project.frames[frame].cels[layer]
			if cel.get_class_name() != "PixelCel":
				return _error("UNSUPPORTED_CEL", "Only PixelCel documents can be patched.")
			if not args.get("pixels", null) is Array or args.pixels.is_empty() or args.pixels.size() > 65536:
				return _error("INVALID_ARGS", "pixels must contain between 1 and 65,536 pixel objects.")
			var image: Image = cel.get_image().duplicate()
			for pixel in args.pixels:
				if not pixel is Dictionary or not _integer(pixel.get("x")) or not _integer(pixel.get("y")) or not _valid_color(pixel.get("color")):
					return _error("INVALID_ARGS", "Every pixel needs integer x/y and a #RRGGBB or #RRGGBBAA color. Nothing was changed.")
				if int(pixel.x) < 0 or int(pixel.y) < 0 or int(pixel.x) >= image.get_width() or int(pixel.y) >= image.get_height():
					return _error("OUT_OF_BOUNDS", "A pixel is outside the canvas. Nothing was changed.")
				image.set_pixel(int(pixel.x), int(pixel.y), Color.html(pixel.color))
			_api.project.set_pixelcel_image(image, frame, layer)
			var actual: Image = project.frames[frame].cels[layer].get_image()
			for pixel in args.pixels:
				if actual.get_pixel(int(pixel.x), int(pixel.y)).to_html(true) != Color.html(pixel.color).to_html(true):
					return _error("EDIT_NOT_EXACT", "Native editing did not preserve requested RGBA values; inspect the document (indexed color may be enabled).", {"document": _document_info(project)})
			return _ok({"pixels_written": args.pixels.size(), "frame": frame, "layer": layer})
		"document.add_frame":
			var after: Variant = args.get("after_frame", project.current_frame)
			if not _integer(after) or int(after) < 0 or int(after) >= project.frames.size():
				return _error("INVALID_ARGS", "after_frame is outside the document.")
			var count: int = project.frames.size()
			_api.project.add_new_frame(int(after))
			if project.frames.size() != count + 1:
				return _error("EDIT_FAILED", "Pixelorama did not add exactly one frame.")
			return _ok({})
		"document.add_layer":
			var count: int = project.layers.size()
			_api.project.add_new_layer(project.current_layer, str(args.get("name", "Layer")), 0)
			if project.layers.size() != count + 1:
				return _error("EDIT_FAILED", "Pixelorama did not add exactly one pixel layer.")
			return _ok({})
		"document.palette":
			if not args.get("colors", null) is Array or args.colors.is_empty() or args.colors.size() > 256:
				return _error("INVALID_ARGS", "colors must contain 1 to 256 explicit colors.")
			var colors: Array = []
			for color in args.colors:
				if not _valid_color(color):
					return _error("INVALID_ARGS", "Palette colors must use #RRGGBB or #RRGGBBAA.")
				var parsed := Color.html(color)
				colors.append({"color": str(parsed), "index": colors.size()})
			var palette_name := str(args.get("name", "Project palette"))
			_api.palette.create_palette_from_data(palette_name, {"colors": colors, "width": mini(colors.size(), 16), "height": ceili(float(colors.size()) / 16.0), "comment": "Created by Pixel Game"}, false)
			if not project.palettes.has(palette_name):
				return _error("PALETTE_FAILED", "Pixelorama did not create the named project palette.")
			return _ok({"colors": colors.size(), "scope": "project", "remapped_pixels": false})
	return _error("UNKNOWN_OPERATION", "Unknown operation: " + operation)

func _import_sheet(args: Dictionary, root: String) -> Dictionary:
	for field in ["columns", "rows", "frame_width", "frame_height"]:
		if not _integer(args.get(field)) or int(args[field]) < 1 or int(args[field]) > MAX_PIXELS:
			return _error("INVALID_ARGS", field + " must be a positive integer within the pixel budget.")
	var columns := int(args.columns)
	var rows := int(args.rows)
	var count := columns * rows
	var width := int(args.frame_width)
	var height := int(args.frame_height)
	if columns > 64 or rows > 64 or count > 64 or width * height * count > MAX_PIXELS:
		return _error("INVALID_ARGS", "Import supports at most 64 frames and 16,777,216 destination pixels in total.")
	var name: Variant = args.get("name", "Imported sheet")
	if not name is String or name.is_empty() or name.length() > 128 or not name.is_valid_filename():
		return _error("INVALID_ARGS", "name must be a valid filename containing 1 to 128 characters.")
	var checked := _checked_path(str(args.get("path", "")), root, false)
	if not checked.ok:
		return checked
	var source := Image.load_from_file(checked.data.path)
	if source == null or source.is_empty() or source.get_width() * source.get_height() > MAX_PIXELS:
		return _error("IMPORT_FAILED", "Image could not be loaded or exceeds the 16,777,216-pixel source limit.")
	source.convert(Image.FORMAT_RGBA8)
	var source_width := source.get_width()
	var source_height := source.get_height()
	var rects: Array = []
	if args.has("frame_rects"):
		if not args.frame_rects is Array or args.frame_rects.size() != count:
			return _error("INVALID_ARGS", "frame_rects must contain exactly columns * rows rectangles [x, y, width, height].")
		for item in args.frame_rects:
			if not item is Array or item.size() != 4:
				return _error("INVALID_ARGS", "Every frame rectangle must be [x, y, width, height].")
			for value in item:
				if not _integer(value) or int(value) < 0 or int(value) > MAX_PIXELS:
					return _error("INVALID_ARGS", "Frame rectangle values must be nonnegative integers within the source image.")
			if int(item[2]) < 1 or int(item[3]) < 1 or int(item[0]) + int(item[2]) > source_width or int(item[1]) + int(item[3]) > source_height:
				return _error("OUT_OF_BOUNDS", "A frame rectangle is empty or outside the source image. No document was created.")
			rects.append([int(item[0]), int(item[1]), int(item[2]), int(item[3])])
	else:
		if columns > source_width or rows > source_height:
			return _error("INVALID_ARGS", "The source grid must provide at least one pixel per frame.")
		for row in rows:
			var top := roundi(float(row) * source_height / rows)
			var bottom := roundi(float(row + 1) * source_height / rows)
			for column in columns:
				var left := roundi(float(column) * source_width / columns)
				var right := roundi(float(column + 1) * source_width / columns)
				rects.append([left, top, right - left, bottom - top])
	# Prepare all validated images before creating a native document. No trimming,
	# background removal, palette remapping, or source-file write is performed.
	var images: Array[Image] = []
	var scale_factors: Array = []
	for rect in rects:
		var image := source.get_region(Rect2i(int(rect[0]), int(rect[1]), int(rect[2]), int(rect[3])))
		image.resize(width, height, Image.INTERPOLATE_NEAREST)
		images.append(image)
		scale_factors.append({"x": float(width) / int(rect[2]), "y": float(height) / int(rect[3])})
	var frame_script: Script = load("res://src/Classes/Frame.gd")
	var empty_frames := Array([], TYPE_OBJECT, "RefCounted", frame_script)
	var created: Variant = _api.project.new_project(empty_frames, name, Vector2(width, height), Color.TRANSPARENT)
	if created == null:
		return _error("IMPORT_FAILED", "Pixelorama did not create the destination document.")
	created.frames.clear()
	for image in images:
		var frame: Variant = frame_script.new()
		frame.cels.append(created.layers[0].new_cel_from_image(image))
		created.frames.append(frame)
	_api.project.current_project = created
	for index in count:
		var actual: Image = created.frames[index].cels[0].get_image()
		if actual.get_data() != images[index].get_data():
			return _error("IMPORT_NOT_EXACT", "Native import did not preserve the normalized RGBA values; inspect the new document.", {"document": _document_info(created)})
	return _ok({"path": checked.data.path, "source_sha256": FileAccess.get_sha256(checked.data.path), "source_dimensions": [source_width, source_height], "source_rects": rects, "frame_width": width, "frame_height": height, "frames": count, "grid": {"columns": columns, "rows": rows}, "interpolation": "nearest", "scale_factors": scale_factors, "trimmed": false, "palette_remapped": false})

func _image_operation(operation: String, args: Dictionary, root: String, project: Variant) -> Dictionary:
	var indices := _indices(args, project)
	if not indices.ok:
		return indices
	var frame: int = indices.data.frame
	var image: Image
	if args.has("layer"):
		var cel: Variant = project.frames[frame].cels[indices.data.layer]
		if cel.get_class_name() != "PixelCel":
			return _error("UNSUPPORTED_CEL", "Layer export requires a PixelCel.")
		image = cel.get_image().duplicate()
	else:
		image = _composite(project, frame)
	if operation == "document.export_sheet":
		var columns: Variant = args.get("columns", project.frames.size())
		if not _integer(columns) or int(columns) < 1 or int(columns) > project.frames.size():
			return _error("INVALID_ARGS", "columns must be between 1 and the frame count.")
		var rows := ceili(float(project.frames.size()) / float(columns))
		if int(project.size.x) * int(columns) * int(project.size.y) * rows > MAX_PIXELS:
			return _error("IMAGE_TOO_LARGE", "The sheet exceeds the 16,777,216-pixel limit.")
		image = Image.create(int(project.size.x) * int(columns), int(project.size.y) * rows, false, Image.FORMAT_RGBA8)
		for index in project.frames.size():
			var part := _composite(project, index)
			image.blit_rect(part, Rect2i(Vector2i.ZERO, part.get_size()), Vector2i((index % int(columns)) * int(project.size.x), (index / int(columns)) * int(project.size.y)))
	var source_dimensions := [image.get_width(), image.get_height()]
	var preview_region: Array = []
	if operation == "document.preview" and args.has("region"):
		if not args.region is Array or args.region.size() != 4:
			return _error("INVALID_ARGS", "region must be [x, y, width, height].")
		for value in args.region:
			if not _integer(value) or int(value) < 0 or int(value) > MAX_PIXELS:
				return _error("INVALID_ARGS", "region values must be nonnegative integers within the image.")
		preview_region = [int(args.region[0]), int(args.region[1]), int(args.region[2]), int(args.region[3])]
		if preview_region[2] < 1 or preview_region[3] < 1 or preview_region[0] + preview_region[2] > image.get_width() or preview_region[1] + preview_region[3] > image.get_height():
			return _error("OUT_OF_BOUNDS", "The preview region is empty or outside the image.")
		image = image.get_region(Rect2i(preview_region[0], preview_region[1], preview_region[2], preview_region[3]))
	var scale: Variant = args.get("scale", 1)
	if not _integer(scale) or int(scale) < 1 or int(scale) > 16 or image.get_width() * image.get_height() * int(scale) * int(scale) > MAX_PIXELS:
		return _error("INVALID_ARGS", "scale must be an integer from 1 to 16 within the output pixel limit.")
	if int(scale) > 1:
		image.resize(image.get_width() * int(scale), image.get_height() * int(scale), Image.INTERPOLATE_NEAREST)
	var data := {"width": image.get_width(), "height": image.get_height(), "frame": frame, "interpolation": "nearest"}
	if not preview_region.is_empty():
		data["source_dimensions"] = source_dimensions
		data["region"] = preview_region
	if operation == "document.preview":
		data["mime_type"] = "image/png"
		data["base64"] = Marshalls.raw_to_base64(image.save_png_to_buffer())
	else:
		var checked := _checked_path(str(args.get("path", "")), root, true)
		if not checked.ok:
			return checked
		if checked.data.path.get_extension().to_lower() != "png":
			return _error("INVALID_ARGS", "PNG exports must use the .png extension.")
		var error := image.save_png(checked.data.path)
		if error != OK:
			return _error("EXPORT_FAILED", error_string(error))
		data["path"] = checked.data.path
		data["sha256"] = FileAccess.get_sha256(checked.data.path)
	return _ok(data)

func _composite(project: Variant, frame: int) -> Image:
	var image := Image.create(int(project.size.x), int(project.size.y), false, Image.FORMAT_RGBA8)
	_api.general.get_drawing_algos().blend_layers(image, project.frames[frame], Vector2i.ZERO, project)
	return image

func _document_info(project: Variant) -> Dictionary:
	var instance := str(project.get_instance_id())
	var hash_context := HashingContext.new()
	hash_context.start(HashingContext.HASH_SHA256)
	hash_context.update(JSON.stringify(_api.project.get_project_info(project)).to_utf8_buffer())
	for frame in project.frames:
		for cel in frame.cels:
			if cel.has_method("get_image"):
				var image: Image = cel.get_image()
				if image != null:
					hash_context.update(image.get_data())
	var fingerprint := hash_context.finish().hex_encode()
	if not _states.has(instance):
		_states[instance] = {"revision": 1, "fingerprint": fingerprint}
	elif _states[instance].fingerprint != fingerprint:
		_states[instance].revision += 1
		_states[instance].fingerprint = fingerprint
	var layers: Array = []
	for layer in project.layers:
		layers.append({"name": str(layer.name), "type": layer.get_class_name()})
	return {"id": _session + ":" + instance, "revision": _states[instance].revision, "fingerprint": fingerprint, "name": str(project.name), "width": int(project.size.x), "height": int(project.size.y), "frames": project.frames.size(), "fps": float(project.fps), "layers": layers, "palettes": project.palettes.keys(), "current_frame": project.current_frame, "current_layer": project.current_layer, "save_path": str(project.save_path)}

func _indices(args: Dictionary, project: Variant) -> Dictionary:
	var frame: Variant = args.get("frame", project.current_frame)
	var layer: Variant = args.get("layer", project.current_layer)
	if not _integer(frame) or not _integer(layer) or int(frame) < 0 or int(frame) >= project.frames.size() or int(layer) < 0 or int(layer) >= project.layers.size():
		return _error("INVALID_ARGS", "frame or layer is outside the document.")
	return _ok({"frame": int(frame), "layer": int(layer)})

func _allowed_root(path: String) -> bool:
	var normalized := path.replace("\\", "/").simplify_path().trim_suffix("/")
	if not normalized.is_absolute_path() or normalized.begins_with("res:") or normalized.begins_with("user:"):
		return false
	for root in _roots:
		if _inside(normalized, root) and DirAccess.dir_exists_absolute(normalized) and not _has_link(normalized):
			return true
	return false

func _checked_path(path: String, root: String, writing: bool) -> Dictionary:
	if path.is_empty():
		return _error("INVALID_ARGS", "path is required.")
	var absolute := path.replace("\\", "/")
	if not absolute.is_absolute_path():
		absolute = root.replace("\\", "/").path_join(absolute)
	absolute = absolute.simplify_path()
	if not _allowed_root(root) or not _inside(absolute, root.replace("\\", "/").simplify_path()) or _has_link(absolute):
		return _error("PATH_DENIED", "Path must remain within project_root and may not traverse symbolic links.")
	if writing and not DirAccess.dir_exists_absolute(absolute.get_base_dir()):
		return _error("DIRECTORY_MISSING", "Create the destination directory before exporting.")
	if not writing and not FileAccess.file_exists(absolute):
		return _error("FILE_MISSING", "The input file does not exist.")
	return _ok({"path": absolute})

func _has_link(path: String) -> bool:
	var normalized := path.replace("\\", "/").simplify_path()
	var cursor := normalized.get_base_dir()
	var filename := normalized.get_file()
	while not cursor.is_empty() and cursor != ".":
		var directory := DirAccess.open(cursor)
		if directory != null and directory.is_link(filename):
			return true
		filename = cursor.get_file()
		var parent := cursor.get_base_dir()
		if parent == cursor:
			break
		cursor = parent
	return false

func _inside(path: String, root: String) -> bool:
	var candidate := path.to_lower() if OS.get_name() == "Windows" else path
	var base := root.trim_suffix("/").to_lower() if OS.get_name() == "Windows" else root.trim_suffix("/")
	return candidate == base or candidate.begins_with(base + "/")

func _integer(value: Variant) -> bool:
	return value is int or (value is float and is_finite(value) and float(value) == floorf(float(value)))

func _valid_color(value: Variant) -> bool:
	return value is String and value.begins_with("#") and (value.length() == 7 or value.length() == 9) and Color.html_is_valid(value)

func _ok(data: Dictionary) -> Dictionary:
	return {"ok": true, "data": data}

func _error(code: String, message: String, details: Dictionary = {}) -> Dictionary:
	return {"ok": false, "error": {"code": code, "message": message, "details": details}}

func _envelope(request: Dictionary, result: Dictionary) -> Dictionary:
	result["request_id"] = str(request.get("request_id", ""))
	result["operation"] = str(request.get("operation", ""))
	return result
