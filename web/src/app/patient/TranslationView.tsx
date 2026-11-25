import Card from "@/components/ui/Card";
import StatusBadge from "@/components/ui/StatusBadge";
import SpeechButton from "@/components/ui/SpeechButton";
import type { TrackedTranslation } from "@/lib/translations";

/** Read-only renderer for a persisted translation — used for both roles. */
export default function TranslationView({ translation }: { translation: TrackedTranslation }) {
  const fullText = translation.sentences.map((s) => s.text).join(" ");
  const generatedAt = translation.generatedAt?.toDate();

  return (
    <Card className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <h4 className="font-medium">Plain-language explanation</h4>
        <StatusBadge
          level="info"
          label={`${translation.modality} · ${generatedAt && Number.isFinite(generatedAt.getTime()) ? generatedAt.toLocaleString() : "Time unavailable"}`}
        />
        <SpeechButton text={fullText} />
      </div>
      <ul className="space-y-2 text-sm">
        {translation.sentences.map((sentence, index) => (
          <li key={index}>
            {sentence.unjustified ? (
              <StatusBadge level="warning" label={sentence.text} />
            ) : (
              <>
                <p>{sentence.text}</p>
                {sentence.sourceSpan && (
                  <blockquote className="border-l-2 border-border pl-2 text-foreground/80">
                    {sentence.sourceSpan}
                  </blockquote>
                )}
              </>
            )}
          </li>
        ))}
      </ul>
    </Card>
  );
}
