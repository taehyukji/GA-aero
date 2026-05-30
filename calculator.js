var wingProfiles = {
  delta: {
    label: "델타익",
    areaFormula: "S = b x c_r / 2",
    idealAspectRatio: 2.4,
    baseScores: { speed: 82, maneuverability: 86, fuel: 48, stability: 62 },
    sweepSpeedFactor: 0.08,
    tipMode: "zero",
    preview: { sweep: 0.8, tipRatio: 0 }
  },
  swept: {
    label: "후퇴익",
    areaFormula: "S = (c_r + c_t) x b / 2",
    idealAspectRatio: 5.5,
    baseScores: { speed: 76, maneuverability: 64, fuel: 58, stability: 70 },
    sweepSpeedFactor: 0.22,
    tipMode: "input",
    preview: { sweep: 0.48, tipRatio: 0.46 }
  },
  forward: {
    label: "전진익",
    areaFormula: "S = (c_r + c_t) x b / 2",
    idealAspectRatio: 6.2,
    baseScores: { speed: 72, maneuverability: 84, fuel: 62, stability: 54 },
    sweepSpeedFactor: 0.18,
    tipMode: "input",
    preview: { sweep: -0.38, tipRatio: 0.52 }
  },
  tapered: {
    label: "테이퍼익",
    areaFormula: "S = (c_r + c_t) x b / 2",
    idealAspectRatio: 7.5,
    baseScores: { speed: 62, maneuverability: 72, fuel: 76, stability: 78 },
    sweepSpeedFactor: 0,
    tipMode: "input",
    preview: { sweep: 0.08, tipRatio: 0.42 }
  },
  elliptical: {
    label: "타원익",
    areaFormula: "S = pi x b x c_r / 4",
    idealAspectRatio: 8.2,
    baseScores: { speed: 58, maneuverability: 60, fuel: 84, stability: 76 },
    sweepSpeedFactor: 0,
    tipMode: "hidden",
    preview: { sweep: 0, tipRatio: 0.18 }
  }
};

function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function calculateArea(profile, dimensions) {
  var span = dimensions.span;
  var rootChord = dimensions.rootChord;
  var tipChord = dimensions.tipChord;

  if (profile.tipMode === "zero") {
    return (span * rootChord) / 2;
  }

  if (profile.tipMode === "hidden") {
    return (Math.PI * span * rootChord) / 4;
  }

  return ((rootChord + tipChord) * span) / 2;
}

function calculateWingResult(wingType, dimensions) {
  var profile = wingProfiles[wingType];
  var normalized = normalizeDimensions(profile, dimensions);
  var area = calculateArea(profile, normalized);
  var aspectRatio = Math.pow(normalized.span, 2) / area;
  var taperRatio = normalized.rootChord === 0 ? 0 : normalized.tipChord / normalized.rootChord;
  var scores = calculateScores(profile, aspectRatio, normalized.sweepAngle);
  var compositeScore = calculateCompositeScore(scores);

  return {
    profile,
    dimensions: normalized,
    area,
    aspectRatio,
    taperRatio,
    scores,
    compositeScore
  };
}

function normalizeDimensions(profile, dimensions) {
  var usesTipChord = profile.tipMode === "input";

  return {
    span: Number(dimensions.span),
    rootChord: Number(dimensions.rootChord),
    tipChord: usesTipChord ? Number(dimensions.tipChord) : 0,
    sweepAngle: profile.sweepSpeedFactor === 0 ? 0 : Number(dimensions.sweepAngle)
  };
}

function calculateScores(profile, aspectRatio, sweepAngle) {
  var arGap = Math.abs(aspectRatio - profile.idealAspectRatio);
  var arFitness = clamp(100 - arGap * 8);
  var highArBonus = clamp((aspectRatio - 4) * 4, -18, 22);
  var lowArSpeedBonus = clamp((5 - aspectRatio) * 4, -18, 18);
  var sweepMagnitude = Math.abs(sweepAngle);
  var sweepBonus = clamp(sweepMagnitude * profile.sweepSpeedFactor, 0, 14);
  var forwardStabilityPenalty = profile.label === "전진익" ? sweepMagnitude * 0.08 : 0;

  return {
    speed: Math.round(clamp(
      profile.baseScores.speed + lowArSpeedBonus + sweepBonus + (arFitness - 70) * 0.12
    )),
    maneuverability: Math.round(clamp(
      profile.baseScores.maneuverability + lowArSpeedBonus * 0.8 + sweepBonus * 0.25 + (arFitness - 70) * 0.1
    )),
    fuel: Math.round(clamp(
      profile.baseScores.fuel + highArBonus + (arFitness - 70) * 0.2
    )),
    stability: Math.round(clamp(
      profile.baseScores.stability + (arFitness - 70) * 0.22 - forwardStabilityPenalty
    ))
  };
}

function calculateCompositeScore(scores) {
  return Math.round((scores.speed + scores.maneuverability + scores.fuel + scores.stability) / 4);
}

function getCompositeScoreCurve(wingType, sweepAngle) {
  var profile = wingProfiles[wingType];
  var minAspectRatio = 1;
  var maxAspectRatio = 14;
  var steps = 120;
  var points = [];
  var minPoint = null;
  var maxPoint = null;
  var index;

  for (index = 0; index <= steps; index += 1) {
    var aspectRatio = minAspectRatio + ((maxAspectRatio - minAspectRatio) * index) / steps;
    var scores = calculateScores(profile, aspectRatio, sweepAngle);
    var compositeScore = calculateCompositeScore(scores);
    var point = {
      aspectRatio: aspectRatio,
      score: compositeScore
    };

    points.push(point);

    if (!minPoint || point.score < minPoint.score) {
      minPoint = point;
    }

    if (!maxPoint || point.score > maxPoint.score) {
      maxPoint = point;
    }
  }

  return {
    points: points,
    minPoint: minPoint,
    maxPoint: maxPoint,
    minAspectRatio: minAspectRatio,
    maxAspectRatio: maxAspectRatio
  };
}

function validateInput(profile, dimensions) {
  var required = [dimensions.span, dimensions.rootChord];
  if (profile.tipMode !== "zero" && profile.tipMode !== "hidden") {
    required.push(dimensions.tipChord);
  }

  if (required.some(function(value) {
    return !isFinite(Number(value));
  })) {
    return "모든 치수는 숫자로 입력해 주세요.";
  }

  if (Number(dimensions.span) <= 0 || Number(dimensions.rootChord) <= 0) {
    return "날개폭과 루트 시위는 0보다 커야 합니다.";
  }

  if (profile.tipMode === "input" && Number(dimensions.tipChord) < 0) {
    return "팁 시위는 0 이상이어야 합니다.";
  }

  if (profile.tipMode === "input" && Number(dimensions.tipChord) > Number(dimensions.rootChord)) {
    return "팁 시위가 루트 시위보다 커서 일반적인 테이퍼 날개 가정에서 벗어납니다.";
  }

  return "";
}

window.wingCalculator = {
  calculateWingResult,
  getCompositeScoreCurve,
  validateInput,
  wingProfiles
};
