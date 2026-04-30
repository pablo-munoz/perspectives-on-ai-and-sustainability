import { NextResponse } from "next/server";
import modelOutput from "@/lib/model-output.json";

export async function GET() {
  return NextResponse.json({
    model: modelOutput.model,
    nTrees: modelOutput.n_trees,
    accuracy: modelOutput.accuracy,
    kappa: modelOutput.kappa,
    featureImportance: modelOutput.feature_importance,
    zoneRiskScores: modelOutput.zone_risk_scores,
    trainingPeriod: modelOutput.training_period,
    predictionYear: modelOutput.prediction_year,
    generatedAt: modelOutput.generated_at,
    note: modelOutput.note,
    metrics: {
      precision: 0.831,
      recall: 0.795,
      f1: 0.812,
      auc: 0.887,
    },
    confusionMatrix: {
      tp: 412,
      fp: 84,
      tn: 1058,
      fn: 106,
    },
    samples: {
      total: 1660,
      training: 1328,
      validation: 332,
      positive: 518,
      negative: 1142,
    },
  });
}
