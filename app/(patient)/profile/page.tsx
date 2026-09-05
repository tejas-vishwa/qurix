"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { User, MapPin, Calendar, Mail } from "lucide-react";

export default function ProfilePage() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    age: "",
    location: "",
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await fetch("/api/user/profile");
      const data = await res.json();
      const u = data?.user || data;
      if (u) {
        setFormData({
          name: u.name && u.name.toLowerCase() !== "patient" && !u.name.startsWith("user_") ? u.name : "",
          email: u.email || "",
          age: u.age ? u.age.toString() : "",
          location: u.location || "",
        });
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage("");

    try {
      const res = await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (res.ok) {
        setMessage("Profile updated successfully!");
        if (formData.name) {
          localStorage.setItem("qurix_user_name", formData.name);
          window.dispatchEvent(new CustomEvent("qurix:profile-updated", { detail: { name: formData.name } }));
        }
      } else {
        setMessage(data.error || "Failed to update profile");
      }
    } catch (error) {
      setMessage("An error occurred");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-4 flex items-center justify-center min-h-[50vh]">
        <p className="text-muted-foreground">Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-8 max-w-3xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Profile Settings</h1>
        <p className="text-slate-500">Manage your personal information and preferences.</p>
      </div>

        <Card className="shadow-neumorphic border-0 bg-glass backdrop-blur-md transition-all">
          <CardHeader>
            <CardTitle className="text-2xl flex items-center gap-2">
              <User className="h-6 w-6 text-primary" /> Personal Details
            </CardTitle>
            <CardDescription>
              This information helps us personalize your health insights.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {message && (
                <div className={`p-4 rounded-md text-sm font-medium shadow-sm ${message.includes('success') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  {message}
                </div>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-semibold flex items-center gap-2 text-slate-700 dark:text-slate-300">
                    <User className="h-4 w-4" /> Full Name
                  </label>
                  <Input 
                    value={formData.name} 
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="rounded-xl border-gray-200 shadow-inner focus:ring-primary/20 transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold flex items-center gap-2 text-slate-700 dark:text-slate-300">
                    <Mail className="h-4 w-4" /> Email Address
                  </label>
                  <Input 
                    value={formData.email} 
                    disabled
                    className="rounded-xl border-gray-200 bg-slate-100 text-slate-500 shadow-inner"
                  />
                  <p className="text-xs text-slate-400">Email cannot be changed.</p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold flex items-center gap-2 text-slate-700 dark:text-slate-300">
                    <Calendar className="h-4 w-4" /> Age
                  </label>
                  <Input 
                    type="number"
                    value={formData.age} 
                    onChange={(e) => setFormData({...formData, age: e.target.value})}
                    placeholder="e.g. 35"
                    className="rounded-xl border-gray-200 shadow-inner focus:ring-primary/20 transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold flex items-center gap-2 text-slate-700 dark:text-slate-300">
                    <MapPin className="h-4 w-4" /> Location
                  </label>
                  <Input 
                    value={formData.location} 
                    onChange={(e) => setFormData({...formData, location: e.target.value})}
                    placeholder="City, Country"
                    className="rounded-xl border-gray-200 shadow-inner focus:ring-primary/20 transition-all"
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end">
                <Button type="submit" disabled={saving} className="rounded-xl px-8 shadow-md hover:shadow-lg transition-all hover:-translate-y-0.5">
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
    </div>
  );
}
