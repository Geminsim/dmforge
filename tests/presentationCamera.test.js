import test from 'node:test';
import assert from 'node:assert/strict';
import { capturePresentationCamera, projectPresentationCamera, samePresentationCamera } from '../src/utils/presentationCamera.js';

test('projects the same world center into differently sized DM and presenter viewports', () => {
  const camera = capturePresentationCamera({ scale: 1.5, positionX: -420, positionY: -180 }, { width: 900, height: 600 });
  const projected = projectPresentationCamera(camera, { width: 1600, height: 900 });
  assert.equal((800 - projected.x) / projected.scale, camera.centerX);
  assert.equal((450 - projected.y) / projected.scale, camera.centerY);
});

test('legacy cameras retain their raw offsets and identical targets are deduplicated', () => {
  assert.deepEqual(projectPresentationCamera({ scale: 2, x: -50, y: 25 }, { width: 1600, height: 900 }), { scale: 2, x: -50, y: 25 });
  assert.equal(samePresentationCamera({ scale: 1, x: 10, y: 20 }, { scale: 1.001, x: 10.1, y: 20.1 }), true);
});
