import assert from 'node:assert/strict';
import test from 'node:test';

import { formatJsonText, parseSceneText, pixelsToAscii, sceneToAscii } from './ascii.js';

test('parseSceneText rejects blank input', () => {
  const result = parseSceneText('   ');
  assert.equal(result.ok, false);
  assert.equal(result.error, 'Paste Excalidraw scene JSON first.');
});

test('parseSceneText requires an elements array', () => {
  const result = parseSceneText('{"type":"excalidraw"}');
  assert.equal(result.ok, false);
  assert.equal(result.error, 'No Excalidraw elements were found in that JSON.');
});

test('parseSceneText filters deleted elements', () => {
  const result = parseSceneText(
    JSON.stringify({
      type: 'excalidraw',
      elements: [
        { id: 'keep', isDeleted: false },
        { id: 'drop', isDeleted: true },
      ],
      appState: { viewBackgroundColor: '#fff' },
      files: {},
    }),
  );

  assert.equal(result.ok, true);
  assert.deepEqual(result.scene.elements.map((element) => element.id), ['keep']);
  assert.deepEqual(result.scene.appState, { viewBackgroundColor: '#fff' });
  assert.deepEqual(result.scene.files, {});
});

test('formatJsonText pretty prints valid json', () => {
  const result = formatJsonText('{"a":1,"b":{"c":2}}');
  assert.equal(result.ok, true);
  assert.equal(result.text, '{\n  "a": 1,\n  "b": {\n    "c": 2\n  }\n}\n');
});

test('formatJsonText rejects invalid json', () => {
  const result = formatJsonText('{');
  assert.equal(result.ok, false);
  assert.equal(result.error, 'The pasted content is not valid JSON.');
});

test('pixelsToAscii maps darkest and lightest pixels predictably', () => {
  const output = pixelsToAscii(
    {
      width: 2,
      height: 2,
      data: new Uint8ClampedArray([
        0, 0, 0, 255,
        255, 255, 255, 255,
        255, 255, 255, 255,
        0, 0, 0, 255,
      ]),
    },
    {
      columns: 2,
      ramp: '@.',
      aspectRatio: 1,
    },
  );

  assert.equal(output, '@.\n.@');
});

test('pixelsToAscii blends transparency against white', () => {
  const output = pixelsToAscii(
    {
      width: 1,
      height: 1,
      data: new Uint8ClampedArray([0, 0, 0, 0]),
    },
    {
      columns: 1,
      ramp: '@.',
      aspectRatio: 1,
    },
  );

  assert.equal(output, '.');
});

test('sceneToAscii renders box and arrow diagrams without shading glyphs', () => {
  const scene = {
    elements: [
      {
        id: 'arrow-h',
        type: 'arrow',
        x: 0,
        y: 0,
        width: 30,
        height: 0,
        angle: 0,
        strokeColor: '#1e1e1e',
        backgroundColor: 'transparent',
        fillStyle: 'hachure',
        strokeWidth: 1,
        strokeStyle: 'solid',
        roughness: 0,
        opacity: 100,
        groupIds: [],
        frameId: null,
        index: 'a',
        roundness: null,
        seed: 1,
        version: 1,
        versionNonce: 1,
        isDeleted: false,
        boundElements: null,
        updated: 1,
        link: null,
        locked: false,
        points: [[0, 0], [30, 0]],
        startBinding: null,
        endBinding: null,
        startArrowhead: 'arrow',
        endArrowhead: 'arrow',
        elbowed: false,
      },
      {
        id: 'box',
        type: 'rectangle',
        x: 8,
        y: 2,
        width: 12,
        height: 6,
        angle: 0,
        strokeColor: '#1e1e1e',
        backgroundColor: 'transparent',
        fillStyle: 'hachure',
        strokeWidth: 1,
        strokeStyle: 'solid',
        roughness: 0,
        opacity: 100,
        groupIds: [],
        frameId: null,
        index: 'b',
        roundness: { type: 3 },
        seed: 1,
        version: 1,
        versionNonce: 1,
        isDeleted: false,
        boundElements: null,
        updated: 1,
        link: null,
        locked: false,
      },
      {
        id: 'label',
        type: 'text',
        x: 10,
        y: 4,
        width: 8,
        height: 2,
        angle: 0,
        strokeColor: '#1e1e1e',
        backgroundColor: 'transparent',
        fillStyle: 'hachure',
        strokeWidth: 1,
        strokeStyle: 'solid',
        roughness: 0,
        opacity: 100,
        groupIds: [],
        frameId: null,
        index: 'c',
        roundness: null,
        seed: 1,
        version: 1,
        versionNonce: 1,
        isDeleted: false,
        boundElements: null,
        updated: 1,
        link: null,
        locked: false,
        text: 'test data',
        fontSize: 12,
        fontFamily: 8,
        textAlign: 'left',
        verticalAlign: 'top',
        containerId: null,
        originalText: 'test data',
        autoResize: true,
        lineHeight: 1.25,
      },
    ],
    appState: {},
    files: {},
  };

  const output = sceneToAscii(scene, { columns: 40 });
  assert.match(output, /test data/);
  assert.match(output, /[+|<>-]/);
  assert.equal(/[.@%#*=:]/.test(output), false);
});

test('sceneToAscii renders the provided clipboard payload', () => {
  const scene = {
    type: 'excalidraw/clipboard',
    elements: [
      {
        id: '09yheCpJesVR75zTsTS3c',
        type: 'arrow',
        x: 10965.17669653014,
        y: -8414.383790930933,
        width: 912.5,
        height: 0,
        angle: 0,
        strokeColor: '#1e1e1e',
        backgroundColor: 'transparent',
        fillStyle: 'hachure',
        strokeWidth: 1,
        strokeStyle: 'solid',
        roughness: 0,
        opacity: 100,
        groupIds: [],
        frameId: null,
        index: 'b5e',
        roundness: null,
        seed: 1086227236,
        version: 46,
        versionNonce: 1695669540,
        isDeleted: false,
        boundElements: null,
        updated: 1778490635762,
        link: null,
        locked: false,
        points: [[0, 0], [912.5, 0]],
        startBinding: null,
        endBinding: null,
        startArrowhead: 'arrow',
        endArrowhead: 'arrow',
        elbowed: false,
      },
      {
        id: 'bgYswQ3bQbgnsvJUCzhFC',
        type: 'arrow',
        x: 10976.42669653014,
        y: -8348.133790930933,
        width: 0,
        height: 241.25,
        angle: 0,
        strokeColor: '#1e1e1e',
        backgroundColor: 'transparent',
        fillStyle: 'hachure',
        strokeWidth: 1,
        strokeStyle: 'solid',
        roughness: 0,
        opacity: 100,
        groupIds: [],
        frameId: null,
        index: 'b5f',
        roundness: null,
        seed: 183164956,
        version: 33,
        versionNonce: 1812611996,
        isDeleted: false,
        boundElements: null,
        updated: 1778490639774,
        link: null,
        locked: false,
        points: [[0, 0], [0, 241.25]],
        startBinding: null,
        endBinding: null,
        startArrowhead: 'arrow',
        endArrowhead: 'arrow',
        elbowed: false,
      },
      {
        id: 'A-CrCG_gDmtT1_XDN20Ga',
        type: 'rectangle',
        x: 11036.42669653014,
        y: -8353.133790930933,
        width: 501.25,
        height: 56.25,
        angle: 0,
        strokeColor: '#1e1e1e',
        backgroundColor: 'transparent',
        fillStyle: 'hachure',
        strokeWidth: 1,
        strokeStyle: 'solid',
        roughness: 0,
        opacity: 100,
        groupIds: [],
        frameId: null,
        index: 'b5g',
        roundness: { type: 3 },
        seed: 560896804,
        version: 121,
        versionNonce: 1971579044,
        isDeleted: false,
        boundElements: null,
        updated: 1778490644334,
        link: null,
        locked: false,
      },
      {
        id: 'gfXEVpEvRc47G1UWudH-0',
        type: 'rectangle',
        x: 11145.17669653014,
        y: -8255.633790930933,
        width: 598.75,
        height: 170,
        angle: 0,
        strokeColor: '#1e1e1e',
        backgroundColor: 'transparent',
        fillStyle: 'hachure',
        strokeWidth: 1,
        strokeStyle: 'solid',
        roughness: 0,
        opacity: 100,
        groupIds: [],
        frameId: null,
        index: 'b5h',
        roundness: { type: 3 },
        seed: 613453852,
        version: 136,
        versionNonce: 122429084,
        isDeleted: false,
        boundElements: null,
        updated: 1778490650041,
        link: null,
        locked: false,
      },
      {
        id: 'phhQIEACtnVuasI9wqaHI',
        type: 'text',
        x: 11253.92669653014,
        y: -8250.633790930933,
        width: 178.1999969482422,
        height: 45,
        angle: 0,
        strokeColor: '#1e1e1e',
        backgroundColor: 'transparent',
        fillStyle: 'hachure',
        strokeWidth: 1,
        strokeStyle: 'solid',
        roughness: 0,
        opacity: 100,
        groupIds: [],
        frameId: null,
        index: 'b5i',
        roundness: null,
        seed: 1442243748,
        version: 21,
        versionNonce: 300859804,
        isDeleted: false,
        boundElements: null,
        updated: 1778490655712,
        link: null,
        locked: false,
        text: 'test data',
        fontSize: 36,
        fontFamily: 8,
        textAlign: 'left',
        verticalAlign: 'top',
        containerId: null,
        originalText: 'test data',
        autoResize: true,
        lineHeight: 1.25,
      },
    ],
    files: {},
  };

  const output = sceneToAscii(scene, { columns: 80 });
  assert.match(output, /test data/);
  assert.match(output, /[+\-|<>^v]/);
  assert.equal(/[.@%#*=:]/.test(output), false);
});

test('sceneToAscii centers text inside its enclosing rectangle', () => {
  const scene = {
    elements: [
      {
        id: 'box',
        type: 'rectangle',
        x: 0,
        y: 0,
        width: 40,
        height: 12,
        angle: 0,
        strokeColor: '#1e1e1e',
        backgroundColor: 'transparent',
        fillStyle: 'hachure',
        strokeWidth: 1,
        strokeStyle: 'solid',
        roughness: 0,
        opacity: 100,
        groupIds: [],
        frameId: null,
        index: 'a',
        roundness: { type: 3 },
        seed: 1,
        version: 1,
        versionNonce: 1,
        isDeleted: false,
        boundElements: null,
        updated: 1,
        link: null,
        locked: false,
      },
      {
        id: 'label',
        type: 'text',
        x: 2,
        y: 1,
        width: 10,
        height: 2,
        angle: 0,
        strokeColor: '#1e1e1e',
        backgroundColor: 'transparent',
        fillStyle: 'hachure',
        strokeWidth: 1,
        strokeStyle: 'solid',
        roughness: 0,
        opacity: 100,
        groupIds: [],
        frameId: null,
        index: 'b',
        roundness: null,
        seed: 1,
        version: 1,
        versionNonce: 1,
        isDeleted: false,
        boundElements: null,
        updated: 1,
        link: null,
        locked: false,
        text: 'test data',
        fontSize: 12,
        fontFamily: 8,
        textAlign: 'left',
        verticalAlign: 'top',
        containerId: null,
        originalText: 'test data',
        autoResize: true,
        lineHeight: 1.25,
      },
    ],
    appState: {},
    files: {},
  };

  const output = sceneToAscii(scene, { columns: 40 });
  const textLine = output.split('\n').find((line) => line.includes('test data'));

  assert.ok(textLine);
  assert.match(textLine, /^\|.*test data.*\|$/);
  assert.equal(textLine.includes('+--------'), false);
});

test('sceneToAscii respects the 72-character width for IETF compliance', () => {
  const scene = {
    elements: [
      {
        id: 'box',
        type: 'rectangle',
        x: 0,
        y: 0,
        width: 1000,
        height: 10,
        isDeleted: false,
      },
    ],
  };

  const output = sceneToAscii(scene, { columns: 72 });
  const lines = output.split('\n');
  const maxLength = Math.max(...lines.map((line) => line.length));

  assert.equal(maxLength <= 72, true, `Max line length ${maxLength} exceeds 72`);
});
