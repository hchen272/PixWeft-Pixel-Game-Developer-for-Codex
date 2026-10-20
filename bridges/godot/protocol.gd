extends RefCounted
## Shared JSON protocol helpers. No arbitrary-code RPC is provided.

static var failure: String = ""

static func fail(message: String) -> void:
	failure = message

static func resource_path(value: Variant) -> String:
	var path = str(value)
	if not path.begins_with("res://") or path.contains("\\") or path.trim_prefix("res://").split("/").has(".."):
		fail("Expected a res:// path without parent traversal: " + path)
		return ""
	return path

static func project_path(value: Variant) -> String:
	var path = str(value).replace("\\", "/")
	if path.begins_with("res://"):
		path = ProjectSettings.globalize_path(resource_path(path))
	var base = ProjectSettings.globalize_path("res://").replace("\\", "/").trim_suffix("/") + "/"
	path = path.simplify_path()
	if failure.is_empty() and not path.to_lower().begins_with(base.to_lower()):
		fail("Output must remain within the running project")
		return ""
	return path

static func decode(value: Variant) -> Variant:
	if value is Dictionary:
		if value.has("$type"):
			var data = value.get("value")
			match str(value["$type"]):
				"Vector2":
					if data is Array and data.size() == 2:
						return Vector2(float(data[0]), float(data[1]))
				"Vector2i":
					if data is Array and data.size() == 2:
						return Vector2i(int(data[0]), int(data[1]))
				"Rect2":
					if data is Array and data.size() == 4:
						return Rect2(float(data[0]), float(data[1]), float(data[2]), float(data[3]))
				"Color":
					if data is Array and data.size() in [3, 4]:
						return Color(float(data[0]), float(data[1]), float(data[2]), float(data[3]) if data.size() == 4 else 1.0)
					if data is String and Color.html_is_valid(data):
						return Color.html(data)
				"NodePath":
					return NodePath(str(data))
				"Resource":
					var path = resource_path(data)
					if not path.is_empty() and ResourceLoader.exists(path):
						return load(path)
			fail("Invalid or unsupported typed value: " + str(value.get("$type")))
			return null
		var result: Dictionary = {}
		for key in value:
			result[key] = decode(value[key])
		return result
	if value is Array:
		var result: Array = []
		for item in value:
			result.append(decode(item))
		return result
	return value

static func encode(value: Variant, depth: int = 0) -> Variant:
	if depth > 12:
		return {"truncated": true}
	match typeof(value):
		TYPE_VECTOR2, TYPE_VECTOR2I:
			return {"$type": "Vector2i" if value is Vector2i else "Vector2", "value": [value.x, value.y]}
		TYPE_RECT2:
			return {"$type": "Rect2", "value": [value.position.x, value.position.y, value.size.x, value.size.y]}
		TYPE_COLOR:
			return {"$type": "Color", "value": [value.r, value.g, value.b, value.a]}
		TYPE_NODE_PATH, TYPE_STRING_NAME:
			return str(value)
		TYPE_DICTIONARY:
			var result: Dictionary = {}
			for key in value:
				result[str(key)] = encode(value[key], depth + 1)
			return result
		TYPE_ARRAY:
			var result: Array = []
			for item in value:
				result.append(encode(item, depth + 1))
			return result
		TYPE_OBJECT:
			if value == null:
				return null
			var result = {"class": value.get_class()}
			if value is Resource:
				result["resource_path"] = value.resource_path
			return result
		TYPE_NIL, TYPE_BOOL, TYPE_INT, TYPE_FLOAT, TYPE_STRING:
			return value
	return {"type": type_string(typeof(value)), "value": str(value)}

static func properties(object: Object, names: Array) -> Dictionary:
	var available: Dictionary = {}
	for property in object.get_property_list():
		available[str(property.name)] = property
	var result: Dictionary = {}
	for name in names:
		var key = str(name)
		if not available.has(key):
			fail("Property does not exist: " + key)
			return {}
		result[key] = encode(object.get(key))
	return result

static func set_properties(object: Object, values: Dictionary) -> bool:
	var available: Dictionary = {}
	for property in object.get_property_list():
		available[str(property.name)] = property
	var decoded: Dictionary = {}
	for key in values:
		if str(key) in ["script", "owner"] or not available.has(str(key)):
			fail("Unknown or protected property: " + str(key))
			return false
		var converted = decode(values[key])
		if not failure.is_empty():
			return false
		var expected = int(available[str(key)].type)
		if expected != TYPE_NIL and typeof(converted) != expected:
			if expected == TYPE_FLOAT and typeof(converted) == TYPE_INT:
				converted = float(converted)
			elif expected == TYPE_INT and typeof(converted) == TYPE_FLOAT and converted == int(converted):
				converted = int(converted)
			elif expected == TYPE_STRING_NAME and converted is String:
				converted = StringName(converted)
			else:
				fail("Property type mismatch for " + str(key) + "; expected " + type_string(expected))
				return false
		decoded[key] = converted
	for key in decoded:
		object.set(str(key), decoded[key])
		var actual = object.get(str(key))
		var expected = decoded[key]
		var matches = actual == expected
		if typeof(actual) == TYPE_FLOAT and typeof(expected) == TYPE_FLOAT:
			matches = is_equal_approx(actual, expected)
		elif actual is Vector2 and expected is Vector2:
			matches = actual.is_equal_approx(expected)
		elif actual is Color and expected is Color:
			matches = actual.is_equal_approx(expected)
		if not matches:
			fail("Property did not retain the requested value: " + str(key))
			return false
	return true

static func read_request(path: String) -> Dictionary:
	failure = ""
	var parser = JSON.new()
	var error = parser.parse(FileAccess.get_file_as_string(path))
	if error != OK or not parser.data is Dictionary:
		fail("Invalid request JSON: " + parser.get_error_message())
		return {}
	var request: Dictionary = parser.data
	if not request.get("args", {}) is Dictionary:
		fail("Request args must be an object")
		return request
	var expected = str(request.get("project_root", "")).replace("\\", "/").trim_suffix("/")
	var actual = ProjectSettings.globalize_path("res://").replace("\\", "/").trim_suffix("/")
	if expected.is_empty() or expected.to_lower() != actual.to_lower():
		fail("Request project_root does not match the running project")
	return request

static func write_response(path: String, request: Dictionary, data: Variant) -> bool:
	var response = {"ok": failure.is_empty(), "operation": str(request.get("operation", "")), "request_id": str(request.get("request_id", "")), "data": encode(data), "engine_version": Engine.get_version_info().string}
	if not failure.is_empty():
		response["error"] = {"code": "operation_failed", "message": failure}
	var file = FileAccess.open(path, FileAccess.WRITE)
	if file == null:
		printerr("Unable to write bridge response: " + path)
		return false
	file.store_string(JSON.stringify(response, "\t"))
	file.close()
	return true
