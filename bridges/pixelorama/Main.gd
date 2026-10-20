## Original bridge implementation. All application operations run on the main thread.
extends Node

const Handler = preload("handler.gd")
const MAX_BYTES := 4194304
var _server := TCPServer.new()
var _clients: Array = []
var _handler: RefCounted
var _token := ""
var _port := 0

func _ready() -> void:
	var config_path := OS.get_environment("PIXEL_GAME_PIXELORAMA_CONFIG")
	if config_path.is_empty():
		config_path = "user://pixel-game-bridge.json"
	var config: Variant = JSON.parse_string(FileAccess.get_file_as_string(config_path))
	if not config is Dictionary:
		push_warning("Pixel Game Bridge is disabled: configure pixel-game-bridge.json first.")
		set_process(false)
		return
	_token = str(config.get("token", ""))
	_port = int(config.get("port", 0))
	if _token.length() < 16 or _port < 1024 or _port > 65535:
		push_error("Pixel Game Bridge needs a token of at least 16 characters and an explicit port.")
		set_process(false)
		return
	var api := get_node_or_null("/root/ExtensionsApi")
	if api == null or api.get_api_version() != 8:
		push_error("Pixel Game Bridge requires Pixelorama Extensions API 8.")
		set_process(false)
		return
	_handler = Handler.new()
	_handler.initialize(api, config.get("allowed_roots", []))
	var error := _server.listen(_port, "127.0.0.1")
	if error != OK:
		push_error("Pixel Game Bridge could not listen: " + error_string(error))
		set_process(false)
		return
	print("Pixel Game Bridge listening on 127.0.0.1:%s" % _port)

func _process(_delta: float) -> void:
	if _server.is_connection_available() and _clients.size() < 16:
		_clients.append({"peer": _server.take_connection(), "bytes": PackedByteArray(), "started": Time.get_ticks_msec()})
	for index in range(_clients.size() - 1, -1, -1):
		var client: Dictionary = _clients[index]
		var peer: StreamPeerTCP = client.peer
		peer.poll()
		if peer.get_status() != StreamPeerTCP.STATUS_CONNECTED or Time.get_ticks_msec() - client.started > 10000:
			peer.disconnect_from_host()
			_clients.remove_at(index)
			continue
		var count := peer.get_available_bytes()
		if count > 0:
			if client.bytes.size() + count > MAX_BYTES:
				_reply(peer, 413, {"ok": false, "error": {"code": "REQUEST_TOO_LARGE", "message": "Request exceeds 4 MiB."}})
				_clients.remove_at(index)
				continue
			var received := peer.get_data(count)
			if received[0] != OK:
				continue
			client.bytes.append_array(received[1])
		var bytes: PackedByteArray = client.bytes
		var marker := bytes.get_string_from_utf8().find("\r\n\r\n")
		if marker < 0:
			continue
		# HTTP headers are ASCII; this offset is therefore also a byte offset.
		var header := bytes.slice(0, marker).get_string_from_ascii()
		var lines := header.split("\r\n")
		var length := 0
		var auth := ""
		var transfer_encoding := false
		for line in lines:
			if line.to_lower().begins_with("content-length:"):
				length = int(line.substr(line.find(":") + 1).strip_edges())
			if line.to_lower().begins_with("authorization:"):
				auth = line.substr(line.find(":") + 1).strip_edges()
			if line.to_lower().begins_with("transfer-encoding:"):
				transfer_encoding = true
		if length < 0 or length > MAX_BYTES or transfer_encoding:
			_reply(peer, 400, {"ok": false, "error": {"code": "INVALID_HTTP", "message": "Use a bounded Content-Length body."}})
			_clients.remove_at(index)
			continue
		if bytes.size() < marker + 4 + length:
			continue
		if auth != "Bearer " + _token:
			_reply(peer, 401, {"ok": false, "error": {"code": "UNAUTHORIZED", "message": "Bearer token required."}})
		elif lines[0] == "GET /health HTTP/1.1":
			_reply(peer, 200, {"ok": true, "data": _handler.app_info()})
		elif lines[0] == "POST /command HTTP/1.1":
			var request: Variant = JSON.parse_string(bytes.slice(marker + 4, marker + 4 + length).get_string_from_utf8())
			if request is Dictionary:
				var result: Dictionary = _handler.execute(request)
				_reply(peer, 200 if result.get("ok", false) else 400, result)
			else:
				_reply(peer, 400, {"ok": false, "error": {"code": "INVALID_JSON", "message": "Expected a JSON object."}})
		else:
			_reply(peer, 404, {"ok": false, "error": {"code": "NOT_FOUND", "message": "Unknown endpoint."}})
		_clients.remove_at(index)

func _reply(peer: StreamPeerTCP, code: int, payload: Dictionary) -> void:
	var body := JSON.stringify(payload).to_utf8_buffer()
	var status := "OK" if code == 200 else "Error"
	var header := "HTTP/1.1 %d %s\r\nContent-Type: application/json\r\nContent-Length: %d\r\nConnection: close\r\n\r\n" % [code, status, body.size()]
	var response := header.to_utf8_buffer()
	response.append_array(body)
	peer.put_data(response)
	peer.disconnect_from_host()

func _exit_tree() -> void:
	_server.stop()
	for client in _clients:
		client.peer.disconnect_from_host()
