extends Node2D
## Procedural geometry is deliberately limited to this integration fixture.
## It exercises input, state, collision, interaction, restart, and capture.

var actor_position: Vector2 = Vector2(48, 120)
var interaction_count: int = 0
var completed: bool = false
var input_event_count: int = 0
var pointer_event_count: int = 0
const ACTOR_SIZE: Vector2 = Vector2(12, 12)
const WALL: Rect2 = Rect2(144, 72, 16, 96)
const TARGET: Rect2 = Rect2(264, 100, 28, 40)

func _ready() -> void:
	for action in ["lab_left", "lab_right", "lab_up", "lab_down", "lab_interact", "lab_restart"]:
		if not InputMap.has_action(action): InputMap.add_action(action)
	var keys = {"lab_left": KEY_LEFT, "lab_right": KEY_RIGHT, "lab_up": KEY_UP, "lab_down": KEY_DOWN, "lab_interact": KEY_SPACE, "lab_restart": KEY_R}
	for action in keys:
		var event = InputEventKey.new()
		event.physical_keycode = keys[action]
		InputMap.action_add_event(action, event)
	queue_redraw()

func _input(event: InputEvent) -> void:
	if event is InputEventAction or event is InputEventKey:
		input_event_count += 1
	if event is InputEventMouseButton:
		pointer_event_count += 1
	if event.is_action_pressed("lab_restart"):
		actor_position = Vector2(48, 120)
		interaction_count = 0
		completed = false
	if event.is_action_pressed("lab_interact") and TARGET.grow(12).has_point(actor_position):
		interaction_count += 1
		completed = true
	queue_redraw()

func _physics_process(delta: float) -> void:
	var direction = Input.get_vector("lab_left", "lab_right", "lab_up", "lab_down")
	var next_position = actor_position + direction * 120.0 * delta
	next_position.x = clampf(next_position.x, 12, 308)
	next_position.y = clampf(next_position.y, 12, 228)
	if not WALL.grow(6).has_point(next_position): actor_position = next_position
	queue_redraw()

func _draw() -> void:
	draw_rect(Rect2(8, 8, 304, 224), Color("293946"), false, 2)
	draw_rect(WALL, Color("65747c"))
	draw_rect(TARGET, Color("e7c56d") if completed else Color("4d947f"))
	draw_rect(Rect2(actor_position - ACTOR_SIZE / 2, ACTOR_SIZE), Color("dbe6ec"))
