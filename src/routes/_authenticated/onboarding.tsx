import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { COUNTRIES, SPECIALIZATIONS } from "@/lib/categories";
import { toast } from "sonner";
import { Briefcase, User } from "lucide-react";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({ meta: [{ title: "Get started — WorkBridge" }] }),
  component: Onboarding,
});

function Onboarding() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [kind, setKind] = useState<"freelancer" | "client">("freelancer");
  const [fullName, setFullName] = useState("");
  const [nickname, setNickname] = useState("");
  const [username, setUsername] = useState("");
  const [yearsExp, setYearsExp] = useState<string>("");
  const [availability, setAvailability] = useState<string>("available");
  const [hourlyRate, setHourlyRate] = useState<string>("");
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [country, setCountry] = useState<string>("Russia");
  const [city, setCity] = useState("");
  const [age, setAge] = useState<string>("");
  const [specializationChoice, setSpecializationChoice] = useState<string>("Fullstack Developer");
  const [specializationOther, setSpecializationOther] = useState("");
  const [skills, setSkills] = useState("");
  const [bio, setBio] = useState("");
  const [github, setGithub] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle().then(({ data }) => {
      if (data?.onboarded) navigate({ to: "/dashboard", replace: true });
      if (data) {
        setFullName(data.full_name ?? "");
        setNickname(data.nickname ?? "");
      }
    });
  }, [user, navigate]);

  const save = async () => {
    if (!user) return;
    setSaving(true);
    const specialization =
      specializationChoice === "Other" ? specializationOther.trim() : specializationChoice;
    const { error } = await supabase.from("profiles").update({
      full_name: fullName,
      nickname: nickname || null,
      username: username ? username.toLowerCase().trim() : null,
      kind,
      country,
      city,
      age: age ? Number(age) : null,
      specialization,
      skills: selectedSkills.length
        ? selectedSkills
        : skills.split(",").map((s) => s.trim()).filter(Boolean),
      years_experience: yearsExp ? Number(yearsExp) : null,
      availability,
      hourly_rate: hourlyRate ? Number(hourlyRate) : null,
      bio,
      links: { github, linkedin },
      onboarded: true,
    }).eq("id", user.id);
    // also seed user_roles
    await supabase.from("user_roles").insert({ user_id: user.id, role: kind }).then(() => {});
    setSaving(false);
    if (error) toast.error(error.message);
    else { toast.success("Welcome to WorkBridge!"); navigate({ to: "/dashboard" }); }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-xl rounded-2xl border border-border bg-card p-8 shadow-sm">
        <div className="mb-6 flex items-center gap-2 text-xs text-muted-foreground">
          Step {step} of 3
        </div>
        {step === 1 && (
          <>
            <h1 className="text-2xl font-semibold tracking-tight mb-1">I want to…</h1>
            <p className="text-sm text-muted-foreground mb-6">Choose how you'll use WorkBridge. You can change this later.</p>
            <div className="grid sm:grid-cols-2 gap-3">
              <button onClick={() => setKind("freelancer")} className={`text-left rounded-xl border p-5 transition ${kind === "freelancer" ? "border-primary bg-primary/5" : "border-border hover:bg-accent/40"}`}>
                <Briefcase className="size-5 mb-3 text-primary" />
                <div className="font-medium">Work as a freelancer</div>
                <div className="text-sm text-muted-foreground">Find projects and build a reputation.</div>
              </button>
              <button onClick={() => setKind("client")} className={`text-left rounded-xl border p-5 transition ${kind === "client" ? "border-primary bg-primary/5" : "border-border hover:bg-accent/40"}`}>
                <User className="size-5 mb-3 text-primary" />
                <div className="font-medium">Hire freelancers</div>
                <div className="text-sm text-muted-foreground">Post projects and find talent.</div>
              </button>
            </div>
            <div className="mt-8 flex justify-end">
              <Button onClick={() => setStep(2)}>Next</Button>
            </div>
          </>
        )}
        {step === 2 && (
          <>
            <h1 className="text-2xl font-semibold tracking-tight mb-1">About you</h1>
            <p className="text-sm text-muted-foreground mb-6">Tell us the basics.</p>
            <div className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Full name</Label>
                  <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Nickname</Label>
                  <Input value={nickname} onChange={(e) => setNickname(e.target.value)} />
                </div>
              </div>
              <div className="grid sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label>Country</Label>
                  <Select value={country} onValueChange={setCountry}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {COUNTRIES.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>City</Label>
                  <Input value={city} onChange={(e) => setCity(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Age</Label>
                  <Input type="number" min={14} max={120} value={age} onChange={(e) => setAge(e.target.value)} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Specialization</Label>
                <Select value={specializationChoice} onValueChange={setSpecializationChoice}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SPECIALIZATIONS.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {specializationChoice === "Other" && (
                  <Input
                    className="mt-2"
                    placeholder="Enter your specialization"
                    value={specializationOther}
                    onChange={(e) => setSpecializationOther(e.target.value)}
                  />
                )}
              </div>
              <div className="space-y-1.5">
                <Label>Skills (comma-separated)</Label>
                <Input placeholder="React, TypeScript, Figma" value={skills} onChange={(e) => setSkills(e.target.value)} />
              </div>
            </div>
            <div className="mt-8 flex justify-between">
              <Button variant="ghost" onClick={() => setStep(1)}>Back</Button>
              <Button onClick={() => setStep(3)}>Next</Button>
            </div>
          </>
        )}
        {step === 3 && (
          <>
            <h1 className="text-2xl font-semibold tracking-tight mb-1">Last details</h1>
            <p className="text-sm text-muted-foreground mb-6">Add a bio and social links.</p>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Bio</Label>
                <Textarea rows={4} value={bio} onChange={(e) => setBio(e.target.value)} />
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>GitHub</Label>
                  <Input placeholder="username" value={github} onChange={(e) => setGithub(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>LinkedIn</Label>
                  <Input placeholder="url" value={linkedin} onChange={(e) => setLinkedin(e.target.value)} />
                </div>
              </div>
            </div>
            <div className="mt-8 flex justify-between">
              <Button variant="ghost" onClick={() => setStep(2)}>Back</Button>
              <Button onClick={save} disabled={saving}>{saving ? "Saving..." : "Save & continue"}</Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}