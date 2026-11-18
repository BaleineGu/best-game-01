// Keyboard and mouse, read by the world each step. Keys are tracked by their
// code so WASD and the arrows both work, and the mouse position is kept in
// canvas pixels so the keeper can aim at it.

export function createInput(canvas) {
  const input = {
    keys: new Set(),
    mouseX: 0,
    mouseY: 0,
    mouseDown: false,
    // Edge-triggered presses the world consumes once per step.
    pressed: new Set(),
    pointerActive: false,
  };

  window.addEventListener('keydown', (event) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) {
      event.preventDefault();
    }
    if (!event.repeat) {
      input.keys.add(event.code);
      input.pressed.add(event.code);
    }
  });
  window.addEventListener('keyup', (event) => {
    input.keys.delete(event.code);
  });
  window.addEventListener('blur', () => {
    input.keys.clear();
    input.mouseDown = false;
  });

  function trackMouse(event) {
    const rect = canvas.getBoundingClientRect();
    input.mouseX = ((event.clientX - rect.left) / rect.width) * canvas.width;
    input.mouseY = ((event.clientY - rect.top) / rect.height) * canvas.height;
  }

  canvas.addEventListener('mousemove', trackMouse);
  canvas.addEventListener('mousedown', (event) => {
    trackMouse(event);
    input.mouseDown = true;
    input.pointerActive = true;
  });
  window.addEventListener('mouseup', () => {
    input.mouseDown = false;
  });

  input.consume = function consume(code) {
    if (input.pressed.has(code)) {
      input.pressed.delete(code);
      return true;
    }
    return false;
  };
  input.endStep = function endStep() {
    input.pressed.clear();
  };
  // WASD / arrows as a unit vector; holding the mouse steers toward it instead.
  input.moveVector = function moveVector(player) {
    let x = 0;
    let y = 0;
    if (input.keys.has('KeyA') || input.keys.has('ArrowLeft')) x -= 1;
    if (input.keys.has('KeyD') || input.keys.has('ArrowRight')) x += 1;
    if (input.keys.has('KeyW') || input.keys.has('ArrowUp')) y -= 1;
    if (input.keys.has('KeyS') || input.keys.has('ArrowDown')) y += 1;
    if (x === 0 && y === 0 && input.pointerActive && input.mouseDown) {
      const dx = input.mouseX - player.x;
      const dy = input.mouseY - player.y;
      const len = Math.hypot(dx, dy);
      if (len > 24) {
        x = dx / len;
        y = dy / len;
      }
    }
    const len = Math.hypot(x, y);
    if (len > 1) {
      x /= len;
      y /= len;
    }
    return { x, y };
  };

  return input;
}
