const DEFAULT_RAMP = '@%#*+=-:. ';

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const isSceneObject = (value) => value !== null && typeof value === 'object';

const lumaToRampIndex = (luma, rampLength) => {
  if (rampLength <= 1) {
    return 0;
  }

  return clamp(Math.round((luma / 255) * (rampLength - 1)), 0, rampLength - 1);
};

const samplePixel = (data, width, x, y) => {
  const index = (y * width + x) * 4;
  const alpha = (data[index + 3] ?? 255) / 255;
  const red = data[index] * alpha + 255 * (1 - alpha);
  const green = data[index + 1] * alpha + 255 * (1 - alpha);
  const blue = data[index + 2] * alpha + 255 * (1 - alpha);

  return (red * 299 + green * 587 + blue * 114) / 1000;
};

const DIAGRAM_LINE_CHARS = new Set(['-', '|', '+', '<', '>', '^', 'v']);
const DIAGRAM_PRIORITY = {
  ' ': 0,
  '-': 1,
  '|': 1,
  '+': 2,
  '<': 3,
  '>': 3,
  '^': 3,
  'v': 3,
};
const TEXT_PRIORITY = 4;

const createGrid = (rows, cols) =>
  Array.from({ length: rows }, () => Array.from({ length: cols }, () => ' '));

const createPriorityGrid = (rows, cols) =>
  Array.from({ length: rows }, () => Array.from({ length: cols }, () => 0));

const mergeDiagramChars = (current, next) => {
  if (current === next) {
    return current;
  }

  if (current === ' ') {
    return next;
  }

  if (next === ' ') {
    return current;
  }

  if (current === '+' || next === '+') {
    return '+';
  }

  const currentLine = current === '-' || current === '|';
  const nextLine = next === '-' || next === '|';

  if (currentLine && nextLine && current !== next) {
    return '+';
  }

  if (DIAGRAM_LINE_CHARS.has(next) && !DIAGRAM_LINE_CHARS.has(current)) {
    return next;
  }

  return current;
};

const writeCell = (grid, priorities, x, y, char) => {
  if (y < 0 || y >= grid.length || x < 0 || x >= grid[0].length || char === ' ') {
    return;
  }

  const currentPriority = priorities[y][x];
  const nextPriority = DIAGRAM_PRIORITY[char] ?? 0;

  if (nextPriority < currentPriority) {
    return;
  }

  const current = grid[y][x];
  grid[y][x] = currentPriority === nextPriority ? mergeDiagramChars(current, char) : char;
  priorities[y][x] = nextPriority;
};

const writeString = (grid, priorities, x, y, text) => {
  for (let i = 0; i < text.length; i += 1) {
    const currentX = x + i;
    if (y < 0 || y >= grid.length || currentX < 0 || currentX >= grid[0].length) {
      continue;
    }

    grid[y][currentX] = text[i];
    priorities[y][currentX] = TEXT_PRIORITY;
  }
};

const getElementPoints = (element) => {
  if (!Array.isArray(element.points) || element.points.length === 0) {
    return [];
  }

  return element.points.map(([px, py]) => [element.x + px, element.y + py]);
};

const getSceneBounds = (elements) => {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const element of elements) {
    if (!element || element.isDeleted) {
      continue;
    }

    if (element.type === 'text') {
      minX = Math.min(minX, element.x);
      minY = Math.min(minY, element.y);
      maxX = Math.max(maxX, element.x + element.width);
      maxY = Math.max(maxY, element.y + element.height);
      continue;
    }

    const points = getElementPoints(element);
    if (points.length > 0) {
      for (const [px, py] of points) {
        minX = Math.min(minX, px);
        minY = Math.min(minY, py);
        maxX = Math.max(maxX, px);
        maxY = Math.max(maxY, py);
      }
      continue;
    }

    minX = Math.min(minX, element.x);
    minY = Math.min(minY, element.y);
    maxX = Math.max(maxX, element.x + element.width);
    maxY = Math.max(maxY, element.y + element.height);
  }

  if (!Number.isFinite(minX) || !Number.isFinite(minY) || !Number.isFinite(maxX) || !Number.isFinite(maxY)) {
    return null;
  }

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: Math.max(1, maxX - minX),
    height: Math.max(1, maxY - minY),
  };
};

const scenePointToGrid = (bounds, columns, aspectRatio, x, y) => {
  const cellWidth = bounds.width / columns;
  const cellHeight = cellWidth * aspectRatio;
  return [
    clamp(Math.round((x - bounds.minX) / cellWidth), 0, columns - 1),
    clamp(Math.round((y - bounds.minY) / cellHeight), 0, Math.max(1, Math.ceil(bounds.height / cellHeight)) - 1),
  ];
};

const drawHorizontal = (grid, priorities, y, x1, x2, char) => {
  const start = Math.min(x1, x2);
  const end = Math.max(x1, x2);

  for (let x = start; x <= end; x += 1) {
    writeCell(grid, priorities, x, y, char);
  }
};

const drawVertical = (grid, priorities, x, y1, y2, char) => {
  const start = Math.min(y1, y2);
  const end = Math.max(y1, y2);

  for (let y = start; y <= end; y += 1) {
    writeCell(grid, priorities, x, y, char);
  }
};

const drawRectangle = (grid, priorities, bounds, aspectRatio, columns, element) => {
  const [left, top] = scenePointToGrid(bounds, columns, aspectRatio, element.x, element.y);
  const [right, bottom] = scenePointToGrid(bounds, columns, aspectRatio, element.x + element.width, element.y + element.height);

  const x1 = Math.min(left, right);
  const x2 = Math.max(left, right);
  const y1 = Math.min(top, bottom);
  const y2 = Math.max(top, bottom);

  if (x1 === x2 || y1 === y2) {
    writeCell(grid, priorities, x1, y1, '+');
    return;
  }

  drawHorizontal(grid, priorities, y1, x1, x2, '-');
  drawHorizontal(grid, priorities, y2, x1, x2, '-');
  drawVertical(grid, priorities, x1, y1, y2, '|');
  drawVertical(grid, priorities, x2, y1, y2, '|');

  writeCell(grid, priorities, x1, y1, '+');
  writeCell(grid, priorities, x2, y1, '+');
  writeCell(grid, priorities, x1, y2, '+');
  writeCell(grid, priorities, x2, y2, '+');
};

const scoreTextPlacement = (grid, startX, startY, lines) => {
  let score = 0;

  for (let rowIndex = 0; rowIndex < lines.length; rowIndex += 1) {
    const y = startY + rowIndex;

    if (y < 0 || y >= grid.length) {
      return Number.POSITIVE_INFINITY;
    }

    const line = lines[rowIndex];
    for (let column = 0; column < line.length; column += 1) {
      const x = startX + column;
      if (x < 0 || x >= grid[0].length) {
        return Number.POSITIVE_INFINITY;
      }

      if (grid[y][x] !== ' ') {
        score += 1;
      }
    }
  }

  return score;
};

const wrapText = (text, width) => {
  const safeWidth = Math.max(1, width);
  const wrapped = [];

  for (const paragraph of String(text ?? '').replace(/\t/g, ' ').split('\n')) {
    const words = paragraph.split(/\s+/).filter(Boolean);

    if (words.length === 0) {
      wrapped.push('');
      continue;
    }

    let line = '';

    const flushLine = () => {
      if (line) {
        wrapped.push(line);
        line = '';
      }
    };

    for (const word of words) {
      let remaining = word;

      while (remaining.length > safeWidth) {
        flushLine();
        wrapped.push(remaining.slice(0, safeWidth));
        remaining = remaining.slice(safeWidth);
      }

      if (!line) {
        line = remaining;
        continue;
      }

      if (line.length + 1 + remaining.length <= safeWidth) {
        line += ` ${remaining}`;
      } else {
        flushLine();
        line = remaining;
      }
    }

    flushLine();
  }

  return wrapped.length > 0 ? wrapped : [''];
};

const findEnclosingRectangle = (textElement, elements) => {
  let bestMatch = null;

  for (const element of elements) {
    if (element.type !== 'rectangle' || element.isDeleted) {
      continue;
    }

    const containsLeft = textElement.x >= element.x;
    const containsTop = textElement.y >= element.y;
    const containsRight = textElement.x + textElement.width <= element.x + element.width;
    const containsBottom = textElement.y + textElement.height <= element.y + element.height;

    if (!containsLeft || !containsTop || !containsRight || !containsBottom) {
      continue;
    }

    const area = element.width * element.height;
    if (!bestMatch || area < bestMatch.area) {
      bestMatch = { element, area };
    }
  }

  return bestMatch?.element ?? null;
};

const drawText = (grid, priorities, bounds, aspectRatio, columns, elements, element) => {
  const container = findEnclosingRectangle(element, elements);

  if (container) {
    const [left, top] = scenePointToGrid(bounds, columns, aspectRatio, container.x, container.y);
    const [right, bottom] = scenePointToGrid(
      bounds,
      columns,
      aspectRatio,
      container.x + container.width,
      container.y + container.height,
    );

    const innerLeft = Math.min(left, right) + 1;
    const innerRight = Math.max(left, right) - 1;
    const innerTop = Math.min(top, bottom) + 1;
    const innerBottom = Math.max(top, bottom) - 1;
    const innerWidth = Math.max(1, innerRight - innerLeft + 1);
    const innerHeight = Math.max(1, innerBottom - innerTop + 1);
    const lines = wrapText(element.text, innerWidth);
    const maxLineWidth = Math.max(...lines.map((line) => line.length));
    const maxStartX = Math.max(innerLeft, innerRight - maxLineWidth + 1);
    const maxStartY = Math.max(innerTop, innerBottom - lines.length);
    const [originalX, originalY] = scenePointToGrid(bounds, columns, aspectRatio, element.x, element.y);
    const minStartX = Math.min(innerLeft + 1, maxStartX);
    const minStartY = Math.min(innerTop + 1, maxStartY);
    const startX = clamp(originalX, minStartX, maxStartX);

    let startY = clamp(originalY, minStartY, maxStartY);
    let bestScore = scoreTextPlacement(grid, startX, startY, lines);
    for (let candidate = minStartY; candidate <= maxStartY; candidate += 1) {
      const score = scoreTextPlacement(grid, startX, candidate, lines);
      if (score < bestScore || (score === bestScore && Math.abs(candidate - originalY) < Math.abs(startY - originalY))) {
        startY = candidate;
        bestScore = score;
      }
    }

    lines.forEach((line, index) => {
      writeString(grid, priorities, startX, startY + index, line);
    });
    return;
  }

  const lines = String(element.text ?? '').split('\n');
  const [x, y] = scenePointToGrid(bounds, columns, aspectRatio, element.x, element.y);

  lines.forEach((line, index) => {
    writeString(grid, priorities, x, y + index, line);
  });
};

const drawSegment = (grid, priorities, bounds, aspectRatio, columns, start, end) => {
  const [x1, y1] = scenePointToGrid(bounds, columns, aspectRatio, start[0], start[1]);
  const [x2, y2] = scenePointToGrid(bounds, columns, aspectRatio, end[0], end[1]);

  if (x1 === x2) {
    drawVertical(grid, priorities, x1, y1, y2, '|');
    return { orientation: 'vertical', start: [x1, y1], end: [x2, y2] };
  }

  if (y1 === y2) {
    drawHorizontal(grid, priorities, y1, x1, x2, '-');
    return { orientation: 'horizontal', start: [x1, y1], end: [x2, y2] };
  }

  if (Math.abs(x2 - x1) >= Math.abs(y2 - y1)) {
    drawHorizontal(grid, priorities, y1, x1, x2, '-');
    drawVertical(grid, priorities, x2, y1, y2, '|');
    return { orientation: 'horizontal', start: [x1, y1], end: [x2, y2] };
  }

  drawVertical(grid, priorities, x1, y1, y2, '|');
  drawHorizontal(grid, priorities, y2, x1, x2, '-');
  return { orientation: 'vertical', start: [x1, y1], end: [x2, y2] };
};

const arrowheadForDelta = (dx, dy, isStart) => {
  if (Math.abs(dx) >= Math.abs(dy)) {
    return isStart ? (dx >= 0 ? '<' : '>') : dx >= 0 ? '>' : '<';
  }

  return isStart ? (dy >= 0 ? '^' : 'v') : dy >= 0 ? 'v' : '^';
};

const drawLinearElement = (grid, priorities, bounds, aspectRatio, columns, element) => {
  const points = getElementPoints(element);
  if (points.length < 2) {
    return;
  }

  let firstSegment = null;
  let lastSegment = null;

  for (let i = 0; i < points.length - 1; i += 1) {
    const segment = drawSegment(grid, priorities, bounds, aspectRatio, columns, points[i], points[i + 1]);
    if (!firstSegment) {
      firstSegment = segment;
    }
    lastSegment = segment;
  }

  if (firstSegment && element.startArrowhead === 'arrow') {
    const [startX, startY] = firstSegment.start;
    const [nextX, nextY] = firstSegment.end;
    writeCell(grid, priorities, startX, startY, arrowheadForDelta(nextX - startX, nextY - startY, true));
  }

  if (lastSegment && element.endArrowhead === 'arrow') {
    const [endX, endY] = lastSegment.end;
    const [prevX, prevY] = lastSegment.start;
    writeCell(grid, priorities, endX, endY, arrowheadForDelta(endX - prevX, endY - prevY, false));
  }
};

export const sceneToAscii = (scene, { columns = 120, aspectRatio = 3 } = {}) => {
  if (!scene || !Array.isArray(scene.elements)) {
    return '';
  }

  const elements = scene.elements.filter((element) => element && element.isDeleted !== true);
  const bounds = getSceneBounds(elements);

  if (!bounds) {
    return '';
  }

  const safeColumns = clamp(Math.floor(columns) || 0, 20, 240);
  const cellWidth = bounds.width / safeColumns;
  let rows = Math.max(1, Math.ceil(bounds.height / (cellWidth * aspectRatio)));

  for (let i = 0; i < 3; i += 1) {
    const effectiveAspectRatio = bounds.height / (cellWidth * rows);
    let nextRows = rows;

    for (const element of elements) {
      if (element.type !== 'text') {
        continue;
      }

      const container = findEnclosingRectangle(element, elements);
      if (!container) {
        continue;
      }

      const [left, top] = scenePointToGrid(bounds, safeColumns, effectiveAspectRatio, container.x, container.y);
      const [right, bottom] = scenePointToGrid(
        bounds,
        safeColumns,
        effectiveAspectRatio,
        container.x + container.width,
        container.y + container.height,
      );
      const innerWidth = Math.max(1, Math.max(left, right) - Math.min(left, right) - 1);
      const innerHeight = Math.max(1, Math.max(top, bottom) - Math.min(top, bottom) - 1);
      const wrappedLines = wrapText(element.text, innerWidth);

      if (wrappedLines.length > innerHeight) {
        nextRows = Math.max(nextRows, Math.ceil((rows * wrappedLines.length) / innerHeight));
      }
    }

    if (nextRows === rows) {
      break;
    }

    rows = nextRows;
  }

  const effectiveAspectRatio = bounds.height / (cellWidth * rows);
  const grid = createGrid(rows, safeColumns);
  const priorities = createPriorityGrid(rows, safeColumns);

  for (const element of elements) {
    if (element.type === 'text') {
      drawText(grid, priorities, bounds, effectiveAspectRatio, safeColumns, elements, element);
      continue;
    }

    if (element.type === 'rectangle') {
      drawRectangle(grid, priorities, bounds, effectiveAspectRatio, safeColumns, element);
      continue;
    }

    if (element.type === 'line' || element.type === 'arrow') {
      drawLinearElement(grid, priorities, bounds, effectiveAspectRatio, safeColumns, element);
    }
  }

  return grid.map((row) => row.join('').replace(/[ \t]+$/g, '')).join('\n').trimEnd();
};

export const formatJsonText = (text) => {
  if (typeof text !== 'string' || text.trim() === '') {
    return { ok: false, error: 'Paste Excalidraw scene JSON first.' };
  }

  try {
    return { ok: true, text: `${JSON.stringify(JSON.parse(text), null, 2)}\n` };
  } catch {
    return { ok: false, error: 'The pasted content is not valid JSON.' };
  }
};

export const parseSceneText = (text) => {
  if (typeof text !== 'string' || text.trim() === '') {
    return { ok: false, error: 'Paste Excalidraw scene JSON first.' };
  }

  let parsed;

  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, error: 'The pasted content is not valid JSON.' };
  }

  if (!isSceneObject(parsed) || !Array.isArray(parsed.elements)) {
    return { ok: false, error: 'No Excalidraw elements were found in that JSON.' };
  }

  const elements = parsed.elements.filter((element) => element && element.isDeleted !== true);

  if (elements.length === 0) {
    return { ok: false, error: 'The scene does not contain any visible elements.' };
  }

  return {
    ok: true,
    scene: {
      elements,
      appState: isSceneObject(parsed.appState) ? parsed.appState : {},
      files: isSceneObject(parsed.files) ? parsed.files : null,
    },
  };
};

export const pixelsToAscii = (
  { width, height, data },
  { columns = 100, ramp = DEFAULT_RAMP, aspectRatio = 3 } = {},
) => {
  const safeColumns = clamp(Math.floor(columns) || 0, 1, 240);
  const cellWidth = width / safeColumns;
  const cellHeight = cellWidth * aspectRatio;
  const rows = Math.max(1, Math.floor(height / cellHeight));
  const lines = [];

  for (let row = 0; row < rows; row += 1) {
    let line = '';

    for (let column = 0; column < safeColumns; column += 1) {
      const sampleX = Math.min(width - 1, Math.floor((column + 0.5) * cellWidth));
      const sampleY = Math.min(height - 1, Math.floor((row + 0.5) * cellHeight));
      const luma = samplePixel(data, width, sampleX, sampleY);
      line += ramp[lumaToRampIndex(luma, ramp.length)];
    }

    lines.push(line.replace(/[ \t]+$/g, ''));
  }

  return lines.join('\n').trimEnd();
};

export const canvasToAscii = (canvas, options) => {
  const context = canvas.getContext('2d', { willReadFrequently: true });

  if (!context) {
    throw new Error('Canvas context is unavailable.');
  }

  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  return pixelsToAscii(imageData, options);
};
