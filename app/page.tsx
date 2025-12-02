"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@heroui/button";
import { Input } from "@heroui/input";
import { Card, CardBody, CardHeader } from "@heroui/card";
import { createClient } from "@/lib/supabase/client";
import { FaRegEye, FaRegEyeSlash } from "react-icons/fa";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const supabase = createClient();

  const togglePasswordVisibility = () =>
    setIsPasswordVisible(!isPasswordVisible);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setError(error.message);
        setIsLoading(false);
        return;
      }

      if (data.user) {
        router.push("/dashboard");
        router.refresh();
      }
    } catch (err) {
      setError("An unexpected error occurred");
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-164px)] items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="flex flex-col gap-1 px-8 pt-8 pb-0">
          <h1 className="text-3xl font-bold text-foreground">Admin Login</h1>
          <p className="text-sm text-default-500">
            Enter your credentials to access the dashboard
          </p>
        </CardHeader>
        <CardBody className="px-8 py-8">
          <form onSubmit={handleLogin} className="flex flex-col gap-6">
            <Input
              type="email"
              label="Email"
              placeholder="admin@example.com"
              value={email}
              onValueChange={setEmail}
              isRequired
              variant="bordered"
              size="lg"
              classNames={{
                input: "text-base",
                inputWrapper: "border-default-200 hover:border-default-400",
              }}
            />

            <Input
              label="Password"
              placeholder="Enter your password"
              value={password}
              onValueChange={setPassword}
              isRequired
              variant="bordered"
              size="lg"
              type={isPasswordVisible ? "text" : "password"}
              classNames={{
                input: "text-base",
                inputWrapper: "border-default-200 hover:border-default-400",
              }}
              endContent={
                <button
                  className="focus:outline-none"
                  type="button"
                  onClick={togglePasswordVisibility}
                  aria-label="toggle password visibility"
                >
                  {isPasswordVisible ? (
                    <FaRegEyeSlash className="text-2xl text-default-400 pointer-events-none" />
                  ) : (
                    <FaRegEye className="text-2xl text-default-400 pointer-events-none" />
                  )}
                </button>
              }
            />

            {error && (
              <div className="rounded-lg bg-danger-50 border border-danger-200 px-4 py-3 text-sm text-danger-700">
                {error}
              </div>
            )}

            <Button
              type="submit"
              color="primary"
              size="lg"
              isLoading={isLoading}
              className="font-semibold"
            >
              {isLoading ? "Signing in..." : "Sign In"}
            </Button>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
