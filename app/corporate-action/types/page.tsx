"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Table,
  TableHeader,
  TableBody,
  TableColumn,
  TableRow,
  TableCell,
} from "@heroui/table";
import { Chip } from "@heroui/chip";
import { createClient } from "@/lib/supabase/client";
import axiosInstance from "@/lib/axios";

interface CorporateActionType {
  Id: number;
  Code: string;
  Name: string;
  BseCode: string | null;
  TrendlyneCode: string | null;
  MoneyControlCode: string | null;
  IsDividend: boolean;
  IsActive: boolean;
  CreatedOn?: number;
  UpdatedOn?: number;
}

export default function CorporateActionTypesPage() {
  const [corporateActionTypes, setCorporateActionTypes] = useState<
    CorporateActionType[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/");
        return;
      }

      fetchCorporateActionTypes();
    };

    checkAuth();
  }, [router, supabase.auth]);

  const fetchCorporateActionTypes = async () => {
    try {
      setIsLoading(true);
      const response = await axiosInstance.get("/corporate-action/types");
      const result = response.data;

      if (result.success) {
        setCorporateActionTypes(result.data);
      } else {
        console.error("Failed to fetch corporate action types:", result.error);
      }
    } catch (error) {
      console.error("Error fetching corporate action types:", error);
    } finally {
      setIsLoading(false);
    }
  };

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
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-foreground">
              Corporate Action Types
            </h1>
            <p className="mt-2 text-default-500">
              Manage corporate action type master data
            </p>
          </div>
        </div>

        {/* Corporate Action Types Table */}
        <Table
          aria-label="Corporate action types table"
          className="max-h-[70vh] overflow-auto"
          isHeaderSticky
        >
          <TableHeader>
            <TableColumn>ID</TableColumn>
            <TableColumn>CODE</TableColumn>
            <TableColumn>NAME</TableColumn>
            <TableColumn>BSE CODE</TableColumn>
            <TableColumn>TRENDLYNE CODE</TableColumn>
            <TableColumn>MONEYCONTROL CODE</TableColumn>
            <TableColumn>IS DIVIDEND</TableColumn>
            <TableColumn>STATUS</TableColumn>
          </TableHeader>
          <TableBody>
            {corporateActionTypes.map((type) => (
              <TableRow key={type.Id}>
                <TableCell>{type.Id}</TableCell>
                <TableCell>{type.Code}</TableCell>
                <TableCell>{type.Name}</TableCell>
                <TableCell>{type.BseCode || "-"}</TableCell>
                <TableCell>{type.TrendlyneCode || "-"}</TableCell>
                <TableCell>{type.MoneyControlCode || "-"}</TableCell>
                <TableCell>
                  <Chip
                    color={type.IsDividend ? "primary" : "default"}
                    size="sm"
                    variant="flat"
                  >
                    {type.IsDividend ? "Yes" : "No"}
                  </Chip>
                </TableCell>
                <TableCell>
                  <Chip
                    color={type.IsActive ? "success" : "default"}
                    size="sm"
                    variant="flat"
                  >
                    {type.IsActive ? "Active" : "Inactive"}
                  </Chip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
