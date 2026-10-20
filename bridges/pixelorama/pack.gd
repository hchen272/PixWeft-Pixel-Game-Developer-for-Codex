extends SceneTree

func _initialize() -> void:
	var args := OS.get_cmdline_user_args()
	if args.size() != 2:
		printerr("Usage: godot --headless --script pack.gd -- SOURCE_DIRECTORY OUTPUT_PCK")
		quit(2)
		return
	var source := args[0].replace("\\", "/")
	var destination := args[1].replace("\\", "/")
	var packer := PCKPacker.new()
	var error := packer.pck_start(destination)
	for file in ["extension.json", "Main.tscn", "Main.gd", "handler.gd"]:
		if error == OK:
			error = packer.add_file("res://src/Extensions/PixelGameBridge/" + file, source.path_join(file))
	if error == OK:
		error = packer.flush(true)
	if error != OK:
		printerr(error_string(error))
	quit(0 if error == OK else 1)
