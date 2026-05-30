var calculateWingResult = window.wingCalculator.calculateWingResult;
var getCompositeScoreCurve = window.wingCalculator.getCompositeScoreCurve;
var validateInput = window.wingCalculator.validateInput;
var wingProfiles = window.wingCalculator.wingProfiles;

var elements = {
  form: document.querySelector("#wingForm"),
  wingType: document.querySelector("#wingType"),
  span: document.querySelector("#span"),
  spanSlider: document.querySelector("#spanSlider"),
  spanReadout: document.querySelector("#spanReadout"),
  rootChord: document.querySelector("#rootChord"),
  rootChordSlider: document.querySelector("#rootChordSlider"),
  rootChordReadout: document.querySelector("#rootChordReadout"),
  tipChord: document.querySelector("#tipChord"),
  tipChordSlider: document.querySelector("#tipChordSlider"),
  tipChordReadout: document.querySelector("#tipChordReadout"),
  sweepAngle: document.querySelector("#sweepAngle"),
  sweepAngleSlider: document.querySelector("#sweepAngleSlider"),
  sweepAngleReadout: document.querySelector("#sweepAngleReadout"),
  tipChordField: document.querySelector("#tipChordField"),
  sweepField: document.querySelector("#sweepField"),
  inputNote: document.querySelector("#inputNote"),
  warning: document.querySelector("#warning"),
  ratioBadge: document.querySelector("#ratioBadge"),
  areaValue: document.querySelector("#areaValue"),
  taperValue: document.querySelector("#taperValue"),
  leftWing: document.querySelector("#leftWing"),
  rightWing: document.querySelector("#rightWing"),
  scoreCurve: document.querySelector("#scoreCurve"),
  minPoint: document.querySelector("#minPoint"),
  maxPoint: document.querySelector("#maxPoint"),
  currentPoint: document.querySelector("#currentPoint"),
  minLabel: document.querySelector("#minLabel"),
  maxLabel: document.querySelector("#maxLabel"),
  currentLabel: document.querySelector("#currentLabel"),
  graphScore: document.querySelector("#graphScore"),
  scores: {
    speed: {
      value: document.querySelector("#speedValue"),
      bar: document.querySelector("#speedBar")
    },
    maneuverability: {
      value: document.querySelector("#maneuverabilityValue"),
      bar: document.querySelector("#maneuverabilityBar")
    },
    stability: {
      value: document.querySelector("#stabilityValue"),
      bar: document.querySelector("#stabilityBar")
    },
    fuel: {
      value: document.querySelector("#fuelValue"),
      bar: document.querySelector("#fuelBar")
    },
    overall: {
      value: document.querySelector("#overallValue"),
      bar: document.querySelector("#overallBar")
    }
  }
};

var linkedControls = [
  { number: elements.span, slider: elements.spanSlider },
  { number: elements.rootChord, slider: elements.rootChordSlider },
  { number: elements.tipChord, slider: elements.tipChordSlider },
  { number: elements.sweepAngle, slider: elements.sweepAngleSlider }
];

var previewState = {
  animationId: 0,
  left: null,
  right: null
};
var requestFrame = window.requestAnimationFrame || function(callback) {
  return window.setTimeout(function() {
    callback(Date.now());
  }, 16);
};
var cancelFrame = window.cancelAnimationFrame || window.clearTimeout;

function getDimensions() {
  return {
    span: elements.span.value,
    rootChord: elements.rootChord.value,
    tipChord: elements.tipChord.value,
    sweepAngle: elements.sweepAngle.value
  };
}

function setScore(name, value) {
  elements.scores[name].value.textContent = String(value);
  elements.scores[name].bar.style.width = value + "%";
}

function updateReadouts(result) {
  elements.spanReadout.textContent = result.dimensions.span.toFixed(2);
  elements.rootChordReadout.textContent = result.dimensions.rootChord.toFixed(2);
  elements.tipChordReadout.textContent = result.dimensions.tipChord.toFixed(2);
  elements.sweepAngleReadout.textContent = result.dimensions.sweepAngle.toFixed(1);
}

function updateVisibleFields() {
  var profile = wingProfiles[elements.wingType.value];
  elements.tipChordField.hidden = profile.tipMode === "hidden";
  elements.sweepField.hidden = profile.sweepSpeedFactor === 0;
  elements.tipChord.disabled = profile.tipMode !== "input";
  elements.tipChordSlider.disabled = profile.tipMode !== "input";
  elements.sweepAngleSlider.disabled = profile.sweepSpeedFactor === 0;

  if (profile.tipMode === "zero") {
    elements.inputNote.textContent = "델타익은 팁 시위를 0으로 두고 삼각형 면적으로 계산합니다.";
  } else if (profile.tipMode === "hidden") {
    elements.inputNote.textContent = "타원익은 루트 시위를 기준으로 타원 평면 면적을 계산합니다.";
  } else {
    elements.inputNote.textContent = "팁 시위와 루트 시위로 사다리꼴 평면 면적을 계산합니다.";
  }
}

function syncSliderFromNumber(control) {
  var value = Number(control.number.value);

  if (!isFinite(value)) {
    return;
  }

  if (value > Number(control.slider.max)) {
    control.slider.max = String(value);
  }

  if (value < Number(control.slider.min)) {
    control.slider.min = String(value);
  }

  control.slider.value = String(value);
}

function syncNumberFromSlider(control) {
  control.number.value = control.slider.value;
}

function toPointString(points) {
  return points.map(function(point) {
    return point.x.toFixed(2) + "," + point.y.toFixed(2);
  }).join(" ");
}

function interpolatePoints(fromPoints, toPoints, progress) {
  return toPoints.map(function(target, index) {
    var start = fromPoints[index] || target;
    return {
      x: start.x + (target.x - start.x) * progress,
      y: start.y + (target.y - start.y) * progress
    };
  });
}

function easeOutCubic(value) {
  return 1 - Math.pow(1 - value, 3);
}

function getWingPoints(result) {
  var profile = result.profile;
  var span = Math.max(118, Math.min(174, 114 + result.aspectRatio * 8));
  var chordScale = 22.5;
  var rootHalfChord = Math.max(24, Math.min(78, result.dimensions.rootChord * chordScale));
  var tipHalfChord;

  if (profile.tipMode === "input") {
    tipHalfChord = Math.max(2, Math.min(72, result.dimensions.tipChord * chordScale));
  } else {
    tipHalfChord = Math.max(2, Math.min(72, rootHalfChord * profile.preview.tipRatio));
  }

  var sweep = profile.sweepSpeedFactor === 0
    ? profile.preview.sweep * 70
    : result.dimensions.sweepAngle;
  var centerX = 210;
  var centerY = 110;
  var rootTop = centerY - rootHalfChord;
  var rootBottom = centerY + rootHalfChord;
  var rightTipX = centerX + span;
  var leftTipX = centerX - span;
  var rightTipY = centerY - sweep;
  var leftTipY = centerY - sweep;
  var curve = profile.tipMode === "hidden" ? 0.72 : 1;
  var midX = centerX + span * 0.48;
  var leftMidX = centerX - span * 0.48;
  var midSweep = sweep * 0.48;

  var right = [
    { x: centerX, y: rootTop },
    { x: midX, y: centerY - rootHalfChord * curve - midSweep },
    { x: rightTipX, y: rightTipY - tipHalfChord },
    { x: rightTipX, y: rightTipY + tipHalfChord },
    { x: midX, y: centerY + rootHalfChord * curve - midSweep },
    { x: centerX, y: rootBottom }
  ];

  var left = [
    { x: centerX, y: rootTop },
    { x: leftMidX, y: centerY - rootHalfChord * curve - midSweep },
    { x: leftTipX, y: leftTipY - tipHalfChord },
    { x: leftTipX, y: leftTipY + tipHalfChord },
    { x: leftMidX, y: centerY + rootHalfChord * curve - midSweep },
    { x: centerX, y: rootBottom }
  ];

  return { left, right };
}

function drawWing(points) {
  elements.leftWing.setAttribute("points", toPointString(points.left));
  elements.rightWing.setAttribute("points", toPointString(points.right));
}

function renderWingPreview(result) {
  var target = getWingPoints(result);

  if (!previewState.left || !previewState.right) {
    previewState.left = target.left;
    previewState.right = target.right;
    drawWing(target);
    return;
  }

  cancelFrame(previewState.animationId);

  var start = {
    left: previewState.left,
    right: previewState.right
  };
  var startedAt = window.performance && window.performance.now ? window.performance.now() : Date.now();
  var duration = 320;

  function step(now) {
    var progress = easeOutCubic(Math.min(1, (now - startedAt) / duration));
    var current = {
      left: interpolatePoints(start.left, target.left, progress),
      right: interpolatePoints(start.right, target.right, progress)
    };

    previewState.left = current.left;
    previewState.right = current.right;
    drawWing(current);

    if (progress < 1) {
      previewState.animationId = requestFrame(step);
    }
  }

  previewState.animationId = requestFrame(step);
}

function graphX(aspectRatio, curve) {
  var left = 58;
  var width = 542;
  var clamped = Math.max(curve.minAspectRatio, Math.min(curve.maxAspectRatio, aspectRatio));
  return left + ((clamped - curve.minAspectRatio) / (curve.maxAspectRatio - curve.minAspectRatio)) * width;
}

function graphY(score) {
  var top = 24;
  var height = 148;
  var clamped = Math.max(0, Math.min(100, score));
  return top + (1 - clamped / 100) * height;
}

function graphPoint(point, curve) {
  return {
    x: graphX(point.aspectRatio, curve),
    y: graphY(point.score)
  };
}

function buildSmoothCurvePath(curve) {
  var sampled = [];
  var step = 8;
  var index;

  for (index = 0; index < curve.points.length; index += step) {
    sampled.push(graphPoint(curve.points[index], curve));
  }

  if ((curve.points.length - 1) % step !== 0) {
    sampled.push(graphPoint(curve.points[curve.points.length - 1], curve));
  }

  var path = "M " + sampled[0].x.toFixed(2) + " " + sampled[0].y.toFixed(2);

  for (index = 0; index < sampled.length - 1; index += 1) {
    var previous = sampled[index - 1] || sampled[index];
    var current = sampled[index];
    var next = sampled[index + 1];
    var afterNext = sampled[index + 2] || next;
    var controlOneX = current.x + (next.x - previous.x) / 6;
    var controlOneY = current.y + (next.y - previous.y) / 6;
    var controlTwoX = next.x - (afterNext.x - current.x) / 6;
    var controlTwoY = next.y - (afterNext.y - current.y) / 6;

    path += " C " +
      controlOneX.toFixed(2) + " " + controlOneY.toFixed(2) + ", " +
      controlTwoX.toFixed(2) + " " + controlTwoY.toFixed(2) + ", " +
      next.x.toFixed(2) + " " + next.y.toFixed(2);
  }

  return path;
}

function placeCircle(node, point, curve) {
  node.setAttribute("cx", graphX(point.aspectRatio, curve).toFixed(2));
  node.setAttribute("cy", graphY(point.score).toFixed(2));
}

function getLabelBox(x, y, text) {
  return {
    x: x,
    y: y - 14,
    width: text.length * 8 + 6,
    height: 18
  };
}

function boxesOverlap(first, second) {
  return !(
    first.x + first.width < second.x ||
    second.x + second.width < first.x ||
    first.y + first.height < second.y ||
    second.y + second.height < first.y
  );
}

function clampLabelPosition(x, y, text) {
  var width = text.length * 8 + 6;
  var clampedX = Math.max(62, Math.min(600 - width, x));
  var clampedY = Math.max(34, Math.min(190, y));

  return {
    x: clampedX,
    y: clampedY
  };
}

function placeLabel(node, point, curve, text, placedLabels, preferredOffsets) {
  var pointX = graphX(point.aspectRatio, curve);
  var pointY = graphY(point.score);
  var fallback = preferredOffsets.concat([
    { x: 12, y: -18 },
    { x: 12, y: 24 },
    { x: -96, y: -18 },
    { x: -96, y: 24 },
    { x: -42, y: -30 },
    { x: -42, y: 38 }
  ]);
  var selected = null;
  var selectedBox = null;
  var index;

  for (index = 0; index < fallback.length; index += 1) {
    var candidate = clampLabelPosition(pointX + fallback[index].x, pointY + fallback[index].y, text);
    var box = getLabelBox(candidate.x, candidate.y, text);
    var overlaps = placedLabels.some(function(placed) {
      return boxesOverlap(box, placed);
    });

    if (!overlaps) {
      selected = candidate;
      selectedBox = box;
      break;
    }
  }

  if (!selected) {
    selected = clampLabelPosition(pointX + preferredOffsets[0].x, pointY + preferredOffsets[0].y + placedLabels.length * 20, text);
    selectedBox = getLabelBox(selected.x, selected.y, text);
  }

  node.textContent = text;
  node.setAttribute("x", selected.x.toFixed(2));
  node.setAttribute("y", selected.y.toFixed(2));
  placedLabels.push(selectedBox);
}

function renderCompositeGraph(result) {
  var curve = getCompositeScoreCurve(elements.wingType.value, result.dimensions.sweepAngle);
  var currentPoint = {
    aspectRatio: result.aspectRatio,
    score: result.compositeScore
  };
  var path = buildSmoothCurvePath(curve);

  elements.scoreCurve.setAttribute("d", path);
  placeCircle(elements.minPoint, curve.minPoint, curve);
  placeCircle(elements.maxPoint, curve.maxPoint, curve);
  placeCircle(elements.currentPoint, currentPoint, curve);

  var placedLabels = [];
  placeLabel(elements.maxLabel, curve.maxPoint, curve, "최대 " + curve.maxPoint.score + "점", placedLabels, [
    { x: -88, y: -12 },
    { x: -88, y: 26 },
    { x: 12, y: -12 }
  ]);
  placeLabel(elements.minLabel, curve.minPoint, curve, "최소 " + curve.minPoint.score + "점", placedLabels, [
    { x: 12, y: -10 },
    { x: 12, y: 26 },
    { x: -88, y: -10 }
  ]);
  placeLabel(elements.currentLabel, currentPoint, curve, "현재 " + currentPoint.score + "점", placedLabels, [
    { x: 12, y: -18 },
    { x: 12, y: 28 },
    { x: -92, y: -18 },
    { x: -92, y: 28 }
  ]);
  elements.graphScore.textContent = result.compositeScore + "점";
}

function renderCalculation(event) {
  if (event) {
    event.preventDefault();
  }
  updateVisibleFields();

  var wingType = elements.wingType.value;
  var profile = wingProfiles[wingType];
  var dimensions = getDimensions();
  var warning = validateInput(profile, dimensions);

  elements.warning.textContent = warning;
  elements.warning.hidden = warning === "";

  if (warning && warning.indexOf("일반적인 테이퍼") === -1) {
    return;
  }

  var result = calculateWingResult(wingType, dimensions);

  updateReadouts(result);
  elements.areaValue.textContent = result.area.toFixed(2) + " m²";
  elements.ratioBadge.textContent = "AR " + result.aspectRatio.toFixed(2);
  elements.taperValue.textContent = profile.tipMode === "hidden" ? "타원" : result.taperRatio.toFixed(2);
  elements.form.dataset.wing = wingType;

  setScore("speed", result.scores.speed);
  setScore("maneuverability", result.scores.maneuverability);
  setScore("fuel", result.scores.fuel);
  setScore("stability", result.scores.stability);
  setScore("overall", result.compositeScore);
  renderWingPreview(result);
  renderCompositeGraph(result);

}

elements.wingType.addEventListener("change", function(event) {
  renderCalculation(event);
});
elements.form.addEventListener("submit", function(event) {
  renderCalculation(event);
});

linkedControls.forEach(function(control) {
  syncSliderFromNumber(control);

  control.number.addEventListener("input", function() {
    syncSliderFromNumber(control);
    renderCalculation();
  });

  control.slider.addEventListener("input", function() {
    syncNumberFromSlider(control);
    renderCalculation();
  });

  control.slider.addEventListener("change", function() {
    syncNumberFromSlider(control);
    renderCalculation();
  });
});

renderCalculation();
