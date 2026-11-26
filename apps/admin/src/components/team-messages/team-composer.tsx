"use client";

import { ArrowLeft, Loader2, Users } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { useUnsavedChanges } from "@/components/providers/dialog-provider";
import { TimePicker } from "@/components/shared/time-picker";
import { EntityPicker, NoPetPeopleList, type PickedEntity } from "@/components/team-messages/entity-picker";
import { InlineError } from "@/components/team-messages/inline-error";
import { LinkTextarea } from "@/components/team-messages/link-textarea";
import { NearbyPicker, type NearbySelection } from "@/components/team-messages/nearby-picker";
import { PlacePicker, type PlaceSelection } from "@/components/team-messages/place-picker";
import { ReachSummary } from "@/components/team-messages/reach-summary";
import { planRecipients, RecipientsBlock } from "@/components/team-messages/recipients-preview";
import { SendConfirmDialog } from "@/components/team-messages/send-confirm-dialog";
import {
  AUDIENCE_TONES,
  ToneIcon,
  WHEN_TONES,
  countOf,
  fill,
  formatDateTime,
} from "@/components/team-messages/team-format";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { copy } from "@/config/admin";
import { useAudiencePreview, useSendTeamMessage } from "@/hooks/use-team-messages";
import { useSpeciesOptions } from "@/hooks/use-users";
import {
  TEAM_AUDIENCES,
  TEAM_BODY_MAX,
  TEAM_MAX_PEOPLE,
  TEAM_MAX_PETS,
  TEAM_MAX_SPECIES,
  TEAM_REASON_MAX,
  type TeamAudience,
} from "@/lib/team-messages-constants";
import { audienceSchema, type AudienceInput } from "@/lib/team-messages-contract";
import { checkSchedule, defaultSchedule, localInputToIso, localZoneName, toLocalInput } from "@/lib/team-schedule";

const text = copy.teamMessages;
const c = text.composer;

type Selection = {
  speciesIds: string[];
  pet: PickedEntity[];
  pets: PickedEntity[];
  people: PickedEntity[];
  place: PlaceSelection;
  nearby: NearbySelection;
};

const EMPTY_SELECTION: Selection = {
  speciesIds: [],
  pet: [],
  pets: [],
  people: [],
  place: { countries: [], states: [], cities: [] },
  nearby: { point: null, radiusKm: 20 },
};

// Null means the chosen audience is not complete yet, so nothing is previewed or sent.
export function buildAudience(audience: TeamAudience, s: Selection): AudienceInput | null {
  const candidate = (() => {
    switch (audience) {
      case "species":
        return { audience, speciesIds: s.speciesIds };
      case "pet":
        return { audience, petIds: s.pet.map((p) => p.id) };
      case "pets":
        return { audience, petIds: s.pets.map((p) => p.id) };
      case "people":
        return { audience, accountIds: s.people.map((p) => p.id) };
      case "place":
        return { audience, location: s.place };
      case "nearby":
        return s.nearby.point ? { audience, location: { ...s.nearby.point, radiusKm: s.nearby.radiusKm } } : null;
      default:
        return { audience };
    }
  })();
  if (!candidate) return null;
  const parsed = audienceSchema.safeParse(candidate);
  return parsed.success ? parsed.data : null;
}

// "Leo, mano, jo +2 more" — shows the reviewer the actual picks rather than just a count.
function namesLine(names: string[]): string | null {
  if (names.length === 0) return null;
  const shown = names.slice(0, 3).join(", ");
  return names.length > 3 ? `${shown} ${fill(c.reviewCard.more, { count: names.length - 3 })}` : shown;
}

export function describeSelection(
  audience: TeamAudience,
  s: Selection,
  speciesNames: Map<string, string>,
): string | null {
  switch (audience) {
    case "species":
      return namesLine(s.speciesIds.map((id) => speciesNames.get(id) ?? id.slice(0, 8)));
    case "pet":
      return namesLine(s.pet.map((p) => p.label));
    case "pets":
      return namesLine(s.pets.map((p) => p.label));
    case "people":
      return namesLine(s.people.map((p) => p.label));
    case "place":
      return namesLine([...s.place.countries, ...s.place.states, ...s.place.cities]);
    case "nearby":
      return s.nearby.point
        ? fill(text.history.audienceDetail.nearby, {
            km: s.nearby.radiusKm,
            lat: s.nearby.point.lat.toFixed(4),
            lng: s.nearby.point.lng.toFixed(4),
          })
        : null;
    default:
      return c.audienceHints[audience];
  }
}

const defaultScheduleValue = () => defaultSchedule();

function useDebounced<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(timer);
  }, [value, ms]);
  return debounced;
}

export function TeamComposer() {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [audience, setAudience] = useState<TeamAudience>("all");
  const [selection, setSelection] = useState<Selection>(EMPTY_SELECTION);
  const [when, setWhen] = useState<"now" | "later">("now");
  const [at, setAt] = useState(defaultScheduleValue);
  const [reason, setReason] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const species = useSpeciesOptions();
  const send = useSendTeamMessage();

  const built = useMemo(() => buildAudience(audience, selection), [audience, selection]);
  const speciesNames = useMemo(
    () => new Map((species.data?.items ?? []).map((s) => [s.id, s.name] as const)),
    [species.data],
  );
  const audienceDetail = useMemo(
    () => describeSelection(audience, selection, speciesNames),
    [audience, selection, speciesNames],
  );
  const recipientPlan = useMemo(
    () => planRecipients(audience, selection, speciesNames),
    [audience, selection, speciesNames],
  );
  const debouncedAudience = useDebounced(built, 400);
  const preview = useAudiencePreview(debouncedAudience);
  const settling = built !== null && JSON.stringify(built) !== JSON.stringify(debouncedAudience);

  const bodyOk = body.trim().length > 0 && body.length <= TEAM_BODY_MAX;
  const reaches = preview.data ? preview.data.pets + preview.data.accountsWithoutPets > 0 : false;
  const scheduleProblem = when === "later" ? checkSchedule(at) : null;
  // A scheduled message may be aimed at an audience that is empty today; it is resolved when it goes out.
  const canReview =
    bodyOk &&
    built !== null &&
    !settling &&
    preview.isSuccess &&
    !preview.isPlaceholderData &&
    (reaches || when === "later") &&
    scheduleProblem === null;

  // A typed, unsent message: in-app links open the app modal; reload/close keeps the browser's own box.
  useUnsavedChanges(body.trim().length > 0 && !sent);

  function update<K extends keyof Selection>(key: K, value: Selection[K]) {
    setSelection((prev) => ({ ...prev, [key]: value }));
  }

  async function confirmSend() {
    if (!built) return;
    setSendError(null);
    const sendAt = when === "later" ? (localInputToIso(at) ?? undefined) : undefined;
    try {
      const result = await send.mutateAsync({ ...built, body, sendAt, reason: reason.trim() || undefined });
      setSent(true);
      // Close the review now: navigation can take a moment, and a still-enabled "Send now" invites a second send.
      setConfirming(false);
      if (result.state === "scheduled") {
        toast.success(fill(c.scheduledToast, { time: formatDateTime(result.sendAt ?? sendAt ?? null) }), {
          description: c.scheduledToastDetail,
          duration: 7000,
        });
        router.push("/team-messages?state=scheduled");
        return;
      }
      toast.success(
        fill(c.sentToast, { pets: countOf(result.pets, "pet"), accounts: countOf(result.accountsWithoutPets, "person") }),
        { description: c.sentToastDetail, duration: 7000 },
      );
      router.push("/team-messages?state=sent");
    } catch (error) {
      setSendError(error instanceof Error ? error.message : text.errors.unknown);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
      <div className="flex min-w-0 flex-col gap-6">
        <div className="flex flex-col gap-2">
          <Label htmlFor="team-body">{c.bodyLabel}</Label>
          <LinkTextarea
            id="team-body"
            rows={7}
            value={body}
            maxLength={TEAM_BODY_MAX}
            placeholder={c.bodyPlaceholder}
            onChange={(event) => setBody(event.target.value)}
          />
          <span className="self-end text-xs text-muted-foreground tabular-nums">
            {fill(text.actions.counter, { count: body.length, max: TEAM_BODY_MAX })}
          </span>
        </div>

        <fieldset className="flex min-w-0 flex-col gap-3">
          <legend className="mb-2 text-sm font-medium">{c.audienceLabel}</legend>
          {/* Two columns even on phones: eight full-width cards were most of a phone screen of scrolling. */}
          <div className="grid grid-cols-2 gap-2 xl:grid-cols-4">
            {TEAM_AUDIENCES.map((value) => {
              const active = audience === value;
              const tone = AUDIENCE_TONES[value];
              return (
                <label
                  key={value}
                  className={`flex min-w-0 cursor-pointer items-start gap-2.5 rounded-lg border p-2.5 text-sm transition-colors has-focus-visible:ring-2 has-focus-visible:ring-ring sm:p-3 ${active ? tone.active : "hover:bg-muted/50"}`}
                >
                  <input
                    type="radio"
                    name="team-audience"
                    value={value}
                    checked={active}
                    onChange={() => setAudience(value)}
                    className="sr-only"
                  />
                  <ToneIcon tone={tone} />
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span className="leading-snug font-medium">{text.audiences[value]}</span>
                    <span className="hidden text-xs text-muted-foreground sm:block">{c.audienceHints[value]}</span>
                  </span>
                </label>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground sm:hidden">{c.audienceHints[audience]}</p>
        </fieldset>

        {audience === "species" ? (
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium">{c.speciesLabel}</span>
            {species.isError ? (
              <InlineError message={species.error.message} onRetry={() => void species.refetch()} />
            ) : null}
            <div className="flex flex-wrap gap-2">
              {(species.data?.items ?? []).map((option) => {
                const on = selection.speciesIds.includes(option.id);
                return (
                  <Button
                    key={option.id}
                    type="button"
                    size="sm"
                    variant={on ? "default" : "outline"}
                    aria-pressed={on}
                    disabled={!on && selection.speciesIds.length >= TEAM_MAX_SPECIES}
                    onClick={() =>
                      update(
                        "speciesIds",
                        on ? selection.speciesIds.filter((id) => id !== option.id) : [...selection.speciesIds, option.id],
                      )
                    }
                  >
                    {option.name}
                  </Button>
                );
              })}
            </div>
          </div>
        ) : null}
        {audience === "no_pet" ? <NoPetPeopleList /> : null}
        {audience === "pet" ? (
          <EntityPicker kind="pets" single max={1} selected={selection.pet} onChange={(v) => update("pet", v)} />
        ) : null}
        {audience === "pets" ? (
          <EntityPicker kind="pets" max={TEAM_MAX_PETS} selected={selection.pets} onChange={(v) => update("pets", v)} />
        ) : null}
        {audience === "people" ? (
          <EntityPicker kind="people" max={TEAM_MAX_PEOPLE} selected={selection.people} onChange={(v) => update("people", v)} />
        ) : null}
        {audience === "place" ? <PlacePicker value={selection.place} onChange={(v) => update("place", v)} /> : null}
        {audience === "nearby" ? <NearbyPicker value={selection.nearby} onChange={(v) => update("nearby", v)} /> : null}

        <fieldset className="flex min-w-0 flex-col gap-3">
          <legend className="mb-2 text-sm font-medium">{c.schedule.label}</legend>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {(["now", "later"] as const).map((value) => (
              <label
                key={value}
                className={`flex cursor-pointer items-center gap-2.5 rounded-lg border p-2.5 text-sm font-medium transition-colors has-focus-visible:ring-2 has-focus-visible:ring-ring sm:p-3 ${when === value ? WHEN_TONES[value].active : "hover:bg-muted/50"}`}
              >
                <input
                  type="radio"
                  name="team-when"
                  value={value}
                  checked={when === value}
                  onChange={() => setWhen(value)}
                  className="sr-only"
                />
                <ToneIcon tone={WHEN_TONES[value]} />
                {value === "now" ? c.schedule.now : c.schedule.later}
              </label>
            ))}
          </div>
          {when === "later" ? (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="team-send-at">{c.schedule.at}</Label>
              <TimePicker
                id="team-send-at"
                value={at}
                onChange={setAt}
                minDate={toLocalInput(new Date().toISOString()).slice(0, 10)}
                invalid={scheduleProblem !== null}
                describedBy="team-send-at-help"
              />
              <p id="team-send-at-help" className="text-xs text-muted-foreground">
                {fill(c.schedule.zone, { zone: localZoneName() })}. {c.schedule.note}
              </p>
              {scheduleProblem ? (
                <p role="alert" className="text-xs text-destructive">
                  {c.schedule[scheduleProblem]}
                </p>
              ) : null}
            </div>
          ) : null}
        </fieldset>

        <div className="flex flex-col gap-2">
          <Label htmlFor="team-reason">{c.reasonLabel}</Label>
          <Textarea
            id="team-reason"
            rows={2}
            value={reason}
            maxLength={TEAM_REASON_MAX}
            placeholder={c.reasonPlaceholder}
            onChange={(event) => setReason(event.target.value)}
          />
        </div>
      </div>

      {/* Pinned to the bottom on phones so the reach and the send button stay in view while picking. */}
      <Card className="sticky bottom-3 z-10 shadow-lg lg:top-20 lg:bottom-auto lg:shadow-none">
        <CardContent className="flex flex-col gap-3 pt-4 lg:gap-4 lg:pt-6">
          <div className="flex items-start gap-3">
            <Users className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <div className="min-w-0 flex-1" aria-live="polite">
              {built === null ? (
                <p className="text-sm text-muted-foreground">{c.reach.incomplete}</p>
              ) : preview.isError && !settling ? (
                <InlineError message={preview.error.message} onRetry={() => void preview.refetch()} />
              ) : preview.data && !settling && !preview.isPlaceholderData ? (
                <ReachSummary counts={preview.data} compact />
              ) : (
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  {c.reach.checking}
                </p>
              )}
            </div>
          </div>
          {built !== null ? (
            <div className="border-t pt-3">
              <RecipientsBlock plan={recipientPlan} compact />
            </div>
          ) : null}
          <Button disabled={!canReview} onClick={() => setConfirming(true)}>
            {when === "later" ? c.reviewSchedule : c.review}
          </Button>
        </CardContent>
      </Card>

      {confirming && built && preview.data ? (
        <SendConfirmDialog
          mode={when}
          sendAtIso={when === "later" ? localInputToIso(at) : null}
          audience={built.audience}
          audienceDetail={audienceDetail}
          recipientPlan={recipientPlan}
          counts={preview.data}
          body={body}
          reason={reason}
          error={sendError}
          pending={send.isPending}
          onConfirm={() => void confirmSend()}
          onClose={() => setConfirming(false)}
        />
      ) : null}
    </div>
  );
}

export function ComposerBackLink() {
  return (
    <Link href="/team-messages" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
      <ArrowLeft className="size-4" aria-hidden="true" />
      {c.back}
    </Link>
  );
}
