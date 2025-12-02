"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardBody, CardHeader } from "@heroui/card";
import { Button } from "@heroui/button";
import { createClient } from "@/lib/supabase/client";
import { User } from "@supabase/supabase-js";

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const checkUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/");
        return;
      }

      setUser(user);
      setIsLoading(false);
    };

    checkUser();
  }, [router, supabase.auth]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" />
          <p className="mt-4 text-default-500">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground">Dashboard</h1>
          <p className="mt-2 text-default-500">Welcome back, {user?.email}</p>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card className="shadow-lg">
            <CardHeader className="pb-0">
              <h3 className="text-lg font-semibold text-default-700">
                User Info
              </h3>
            </CardHeader>
            <CardBody>
              <div className="space-y-2">
                <div>
                  <p className="text-sm text-default-500">Email</p>
                  <p className="font-medium text-foreground">{user?.email}</p>
                </div>
                <div>
                  <p className="text-sm text-default-500">User ID</p>
                  <p className="font-mono text-xs text-foreground">
                    {user?.id}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-default-500">Last Sign In</p>
                  <p className="text-sm text-foreground">
                    {user?.last_sign_in_at
                      ? new Date(user.last_sign_in_at).toLocaleString()
                      : "N/A"}
                  </p>
                </div>
              </div>
            </CardBody>
          </Card>

          <Card className="shadow-lg">
            <CardHeader className="pb-0">
              <h3 className="text-lg font-semibold text-default-700">
                Account Status
              </h3>
            </CardHeader>
            <CardBody>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-default-500">
                    Email Verified
                  </span>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      user?.email_confirmed_at
                        ? "bg-success-100 text-success-700"
                        : "bg-warning-100 text-warning-700"
                    }`}
                  >
                    {user?.email_confirmed_at ? "Verified" : "Pending"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-default-500">
                    Account Created
                  </span>
                  <span className="text-sm text-foreground">
                    {user?.created_at
                      ? new Date(user.created_at).toLocaleDateString()
                      : "N/A"}
                  </span>
                </div>
              </div>
            </CardBody>
          </Card>

          <Card className="shadow-lg">
            <CardHeader className="pb-0">
              <h3 className="text-lg font-semibold text-default-700">
                Quick Actions
              </h3>
            </CardHeader>
            <CardBody>
              <div className="flex flex-col gap-2">
                <Button color="primary" variant="flat" size="sm">
                  Manage Portfolio
                </Button>
                <Button color="secondary" variant="flat" size="sm">
                  View Analytics
                </Button>
                <Button color="default" variant="flat" size="sm">
                  Settings
                </Button>
              </div>
            </CardBody>
          </Card>
        </div>

        {/* Additional Content */}
        <div className="mt-8">
          <Card className="shadow-lg">
            <CardHeader>
              <h3 className="text-xl font-semibold text-foreground">
                Welcome to Ritefolio Admin
              </h3>
            </CardHeader>
            <CardBody>
              <p className="text-default-600">
                This is your admin dashboard. You can manage your portfolio,
                view analytics, and configure settings from here.
              </p>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
