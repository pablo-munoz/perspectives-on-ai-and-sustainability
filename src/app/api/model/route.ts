import { NextResponse } from "next/server";
import modelOutput from "@/lib/model-output.json";

export async function GET() {
  // sklearn confusion_matrix layout: [[TN, FP], [FN, TP]]
  const cm = modelOutput.confusion_matrix;
  const [tn, fp] = cm[0];
  const [fn, tp] = cm[1];

  return NextResponse.json({
    model: modelOutput.model,
    nTrees: modelOutput.n_trees,
    accuracy: modelOutput.accuracy,
    kappa: modelOutput.kappa,
    featureImportance: modelOutput.feature_importance,
    zoneRiskScores: modelOutput.zone_risk_scores,
    trainingPeriod: modelOutput.training_period,
    predictionYear: modelOutput.feature_year,
    generatedAt: modelOutput.generated_at,
    note: modelOutput.note,
    metrics: {
      precision: modelOutput.precision,
      recall: modelOutput.recall,
      f1: modelOutput.f1,
      auc: modelOutput.auc,
    },
    confusionMatrix: { tp, fp, tn, fn },
    samples: modelOutput.samples,
  });
}
