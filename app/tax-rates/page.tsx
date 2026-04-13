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
import { Button } from "@heroui/button";
import { Tooltip } from "@heroui/tooltip";
import { Chip } from "@heroui/chip";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "@heroui/modal";
import { Input } from "@heroui/input";
import { Switch } from "@heroui/switch";
import { Autocomplete, AutocompleteItem } from "@heroui/autocomplete";
import { FiPlus, FiEdit2, FiTrash2 } from "react-icons/fi";
import { createClient } from "@/lib/supabase/client";
import { useFormik } from "formik";
import * as Yup from "yup";
import axiosInstance from "@/lib/axios";
import { formatEpochDate } from "@/utils/date";
import { CountryAutocomplete } from "@/components/CountryAutocomplete";

interface TaxRate {
  Id: number;
  InvestmentTypeId: number;
  ShortCode: string;
  CountryId: number;
  ResidentCountryId: number | null;
  Country: string;
  TaxAssetId: number;
  TaxAsset: string;
  LegalStatusId: number;
  LegalStatus: string;
  Period: number;
  StartDate: number;
  EndDate: number | null;
  StcgRate: number;
  LtcgRate: number;
  IncomeRate: number;
  LtcgExemption: number;
  IndexationApplicable: boolean;
  Note: string | null;
  IsActive: boolean;
  CreatedOn: number;
  UpdatedOn: number | null;
}

interface TaxAssetClass {
  Id: number;
  Name: string;
}

interface LegalStatus {
  Id: number;
  Classification: string;
}

interface TaxRateFormData {
  countryId: string;
  residentCountryId: string;
  taxAssetId: string;
  legalStatusId: string;
  period: string;
  startDate: string;
  endDate: string;
  stcgRate: string;
  ltcgRate: string;
  incomeRate: string;
  ltcgExemption: string;
  indexationApplicable: boolean;
  note: string;
  isActive: boolean;
}

const taxRateValidationSchema = Yup.object({
  countryId: Yup.string().required("Country is required"),
  taxAssetId: Yup.string().required("Tax asset is required"),
  legalStatusId: Yup.string().required("Legal status is required"),
  period: Yup.number()
    .typeError("Must be a number")
    .required("Period is required")
    .integer("Must be a whole number")
    .positive("Must be positive"),
  startDate: Yup.string().required("Start date is required"),
  endDate: Yup.string(),
  stcgRate: Yup.number()
    .typeError("Must be a number")
    .required("STCG Rate is required")
    .min(0, "Must be 0 or greater")
    .max(999.99, "Must not exceed 999.99"),
  ltcgRate: Yup.number()
    .typeError("Must be a number")
    .required("LTCG Rate is required")
    .min(0, "Must be 0 or greater")
    .max(999.99, "Must not exceed 999.99"),
  incomeRate: Yup.number()
    .typeError("Must be a number")
    .required("Income Rate is required")
    .min(0, "Must be 0 or greater")
    .max(999.99, "Must not exceed 999.99"),
  ltcgExemption: Yup.number()
    .typeError("Must be a number")
    .min(0, "Must be 0 or greater"),
  indexationApplicable: Yup.boolean(),
  note: Yup.string(),
  isActive: Yup.boolean(),
});

const LEGAL_STATUS_CHIP_COLORS = [
  "primary",
  "secondary",
  "success",
  "warning",
  "danger",
  "default",
] as const;

type ChipColor = (typeof LEGAL_STATUS_CHIP_COLORS)[number];

const getLegalStatusColor = (id: number): ChipColor =>
  LEGAL_STATUS_CHIP_COLORS[(id - 1) % LEGAL_STATUS_CHIP_COLORS.length];

const dateStringToEpoch = (dateStr: string): number => {
  return Math.floor(new Date(dateStr).getTime() / 1000);
};

const epochToDateString = (epoch: number): string => {
  const date = new Date(epoch * 1000);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export default function TaxRatesPage() {
  const [taxRates, setTaxRates] = useState<TaxRate[]>([]);
  const [taxAssets, setTaxAssets] = useState<TaxAssetClass[]>([]);
  const [legalStatuses, setLegalStatuses] = useState<LegalStatus[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filterCountryId, setFilterCountryId] = useState<string>("");
  const [filterTaxAssetId, setFilterTaxAssetId] = useState<string>("");
  const [filterLegalStatusId, setFilterLegalStatusId] = useState<string>("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedTaxRate, setSelectedTaxRate] = useState<TaxRate | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);
  const router = useRouter();

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };
  const supabase = createClient();

  const formik = useFormik<TaxRateFormData>({
    initialValues: {
      countryId: "",
      residentCountryId: "",
      taxAssetId: "",
      legalStatusId: "",
      period: "",
      startDate: "",
      endDate: "",
      stcgRate: "",
      ltcgRate: "",
      incomeRate: "",
      ltcgExemption: "0",
      indexationApplicable: false,
      note: "",
      isActive: true,
    },
    validationSchema: taxRateValidationSchema,
    onSubmit: async (values) => {
      try {
        const payload = {
          countryId: parseInt(values.countryId),
          residentCountryId: values.residentCountryId
            ? parseInt(values.residentCountryId)
            : null,
          taxAssetId: parseInt(values.taxAssetId),
          legalStatusId: parseInt(values.legalStatusId),
          period: parseInt(values.period),
          startDate: dateStringToEpoch(values.startDate),
          endDate: values.endDate ? dateStringToEpoch(values.endDate) : null,
          stcgRate: parseFloat(values.stcgRate),
          ltcgRate: parseFloat(values.ltcgRate),
          incomeRate: parseFloat(values.incomeRate),
          ltcgExemption: parseFloat(values.ltcgExemption) || 0,
          indexationApplicable: values.indexationApplicable,
          note: values.note || null,
          isActive: values.isActive,
        };

        const response = selectedTaxRate
          ? await axiosInstance.put(`/tax-rates/${selectedTaxRate.Id}`, payload)
          : await axiosInstance.post("/tax-rates", payload);

        const result = response.data;

        if (result.success) {
          handleCloseModal();
          fetchTaxRates();
          showToast(
            selectedTaxRate
              ? "Tax rate updated successfully"
              : "Tax rate added successfully",
            "success",
          );
        } else {
          console.error("Failed to save tax rate:", result.error);
          showToast(
            result.message || result.error || "Failed to save tax rate",
            "error",
          );
        }
      } catch (error) {
        console.error("Error saving tax rate:", error);
        showToast("Failed to save tax rate", "error");
      }
    },
  });

  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/");
      }
    };

    checkAuth();
  }, [router, supabase.auth]);

  useEffect(() => {
    if (!filterCountryId || !filterTaxAssetId) {
      setTaxRates([]);
      return;
    }
    fetchTaxRates();
  }, [filterCountryId, filterTaxAssetId, filterLegalStatusId]);

  const fetchTaxRates = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams({ countryId: filterCountryId });
      if (filterTaxAssetId) params.set("taxAssetId", filterTaxAssetId);
      if (filterLegalStatusId) params.set("legalStatusId", filterLegalStatusId);
      const response = await axiosInstance.get(
        `/tax-rates?${params.toString()}`,
      );
      const result = response.data;

      if (result.success) {
        setTaxRates(result.data);
      } else {
        console.error("Failed to fetch tax rates:", result.error);
      }
    } catch (error) {
      console.error("Error fetching tax rates:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTaxAssets = async () => {
    try {
      const response = await axiosInstance.get("/tax-asset-class");
      const result = response.data;
      if (result.success) {
        setTaxAssets(result.data);
      }
    } catch (error) {
      console.error("Error fetching tax asset classes:", error);
    }
  };

  const fetchLegalStatuses = async () => {
    try {
      const response = await axiosInstance.get("/legal-status");
      const result = response.data;
      if (result.success) {
        setLegalStatuses(result.data);
      }
    } catch (error) {
      console.error("Error fetching legal statuses:", error);
    }
  };

  const handleOpenModal = (taxRate?: TaxRate) => {
    fetchTaxAssets();
    fetchLegalStatuses();
    if (taxRate) {
      setSelectedTaxRate(taxRate);
      formik.setValues({
        countryId: String(taxRate.CountryId),
        residentCountryId: taxRate.ResidentCountryId
          ? String(taxRate.ResidentCountryId)
          : "",
        taxAssetId: String(taxRate.TaxAssetId),
        legalStatusId: String(taxRate.LegalStatusId),
        period: String(taxRate.Period),
        startDate: epochToDateString(taxRate.StartDate),
        endDate: taxRate.EndDate ? epochToDateString(taxRate.EndDate) : "",
        stcgRate: String(taxRate.StcgRate),
        ltcgRate: String(taxRate.LtcgRate),
        incomeRate: String(taxRate.IncomeRate),
        ltcgExemption: String(taxRate.LtcgExemption),
        indexationApplicable: taxRate.IndexationApplicable,
        note: taxRate.Note ?? "",
        isActive: taxRate.IsActive,
      });
    } else {
      setSelectedTaxRate(null);
      formik.resetForm();
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedTaxRate(null);
    formik.resetForm();
  };

  const handleDelete = async () => {
    if (!selectedTaxRate) return;

    try {
      setIsDeleting(true);
      const response = await axiosInstance.delete(
        `/tax-rates/${selectedTaxRate.Id}`,
      );
      const result = response.data;

      if (result.success) {
        setIsDeleteModalOpen(false);
        setSelectedTaxRate(null);
        fetchTaxRates();
        showToast("Tax rate deleted successfully", "success");
      } else {
        console.error("Failed to delete tax rate:", result.error);
        showToast(
          result.message || result.error || "Failed to delete tax rate",
          "error",
        );
      }
    } catch (error) {
      console.error("Error deleting tax rate:", error);
      showToast("Failed to delete tax rate", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  const openDeleteModal = (taxRate: TaxRate) => {
    setSelectedTaxRate(taxRate);
    setIsDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setSelectedTaxRate(null);
  };

  return (
    <div className="p-6">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-foreground">Tax Rates</h1>
            <p className="mt-2 text-default-500">Manage tax rate master data</p>
          </div>
          <Button
            color="primary"
            startContent={<FiPlus className="text-lg" />}
            onPress={() => handleOpenModal()}
          >
            Add Tax Rate
          </Button>
        </div>

        {/* Filters */}
        <div className="glass-card rounded-xl mb-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <CountryAutocomplete
              name="filterCountryId"
              label="Tax Country"
              value={filterCountryId ? parseInt(filterCountryId) : undefined}
              onSelectionChange={(value) => {
                setFilterCountryId(value !== null ? String(value) : "");
                setFilterTaxAssetId("");
                setFilterLegalStatusId("");
                if (value) {
                  fetchTaxAssets();
                  fetchLegalStatuses();
                }
              }}
              variant="flat"
              isRequired
            />
            <Autocomplete
              label="Tax Asset"
              placeholder={
                filterCountryId
                  ? "Select a tax asset"
                  : "Select a country first"
              }
              isDisabled={!filterCountryId}
              isRequired
              selectedKey={filterTaxAssetId || null}
              onSelectionChange={(key) =>
                setFilterTaxAssetId(key ? String(key) : "")
              }
              defaultItems={taxAssets}
            >
              {(asset) => (
                <AutocompleteItem key={String(asset.Id)} textValue={asset.Name}>
                  {asset.Name}
                </AutocompleteItem>
              )}
            </Autocomplete>
            <Autocomplete
              label="Legal Status"
              placeholder={
                filterCountryId
                  ? "All legal statuses"
                  : "Select a country first"
              }
              isDisabled={!filterCountryId}
              selectedKey={filterLegalStatusId || null}
              onSelectionChange={(key) =>
                setFilterLegalStatusId(key ? String(key) : "")
              }
              defaultItems={legalStatuses}
              startContent={
                filterLegalStatusId ? (
                  <Chip
                    size="sm"
                    variant="dot"
                    color={getLegalStatusColor(parseInt(filterLegalStatusId))}
                    classNames={{
                      base: "border-none bg-transparent",
                      content: "hidden px-0",
                    }}
                  />
                ) : undefined
              }
            >
              {(ls) => (
                <AutocompleteItem
                  key={String(ls.Id)}
                  textValue={ls.Classification}
                >
                  <div className="flex items-center gap-2">
                    <Chip
                      size="sm"
                      variant="dot"
                      color={getLegalStatusColor(ls.Id)}
                    >
                      {ls.Classification}
                    </Chip>
                  </div>
                </AutocompleteItem>
              )}
            </Autocomplete>
          </div>
        </div>

        {/* Tax Rates Table / Empty State */}
        {!filterCountryId || !filterTaxAssetId ? (
          <div className="glass-card rounded-xl flex flex-col items-center justify-center py-20 text-center">
            <p className="text-default-400 text-sm max-w-sm">
              {!filterCountryId
                ? "Select a country to get started."
                : "Select a tax asset to view applicable tax rates. You may further refine the results by legal status."}
            </p>
          </div>
        ) : isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" />
              <p className="mt-4 text-default-500">Loading...</p>
            </div>
          </div>
        ) : (
          <Table
            aria-label="Tax rates table"
            isHeaderSticky
            className="glass-card rounded-xl shadow-lg overflow-hidden"
            classNames={{
              wrapper: "max-h-[calc(100vh-340px)] p-0",
              base: "p-0",
              th: "text-xs sm:text-sm",
              td: "text-xs sm:text-sm py-2",
            }}
          >
            <TableHeader>
              <TableColumn>ID</TableColumn>
              <TableColumn>INVESTMENT TYPE</TableColumn>
              <TableColumn>PERIOD</TableColumn>
              <TableColumn>START DATE</TableColumn>
              <TableColumn>END DATE</TableColumn>
              <TableColumn>STCG %</TableColumn>
              <TableColumn>LTCG %</TableColumn>
              <TableColumn>INCOME %</TableColumn>
              <TableColumn>LTCG EXEMPTION</TableColumn>
              <TableColumn>INDEXATION</TableColumn>
              <TableColumn>STATUS</TableColumn>
              <TableColumn>ACTIONS</TableColumn>
            </TableHeader>
            <TableBody emptyContent="No tax rates found for the selected filters.">
              {taxRates.map((taxRate) => (
                <TableRow key={taxRate.Id + taxRate.ShortCode}>
                  <TableCell>{taxRate.Id}</TableCell>
                  <TableCell>
                    <Tooltip content={taxRate.LegalStatus}>
                      <Chip
                        size="sm"
                        variant="dot"
                        color={getLegalStatusColor(taxRate.LegalStatusId)}
                      >
                        {taxRate.ShortCode || "-"}
                      </Chip>
                    </Tooltip>
                  </TableCell>
                  <TableCell>{taxRate.Period}</TableCell>
                  <TableCell>{formatEpochDate(taxRate.StartDate)}</TableCell>
                  <TableCell>
                    {taxRate.EndDate ? formatEpochDate(taxRate.EndDate) : "-"}
                  </TableCell>
                  <TableCell>{taxRate.StcgRate}%</TableCell>
                  <TableCell>{taxRate.LtcgRate}%</TableCell>
                  <TableCell>{taxRate.IncomeRate}%</TableCell>
                  <TableCell>{taxRate.LtcgExemption}</TableCell>
                  <TableCell>
                    <Chip
                      color={
                        taxRate.IndexationApplicable ? "secondary" : "default"
                      }
                      size="sm"
                      variant="flat"
                    >
                      {taxRate.IndexationApplicable ? "Yes" : "No"}
                    </Chip>
                  </TableCell>
                  <TableCell>
                    <Chip
                      color={taxRate.IsActive ? "success" : "default"}
                      size="sm"
                      variant="flat"
                    >
                      {taxRate.IsActive ? "Active" : "Inactive"}
                    </Chip>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Tooltip content="Edit">
                        <Button
                          size="sm"
                          variant="light"
                          isIconOnly
                          onPress={() => handleOpenModal(taxRate)}
                          aria-label="Edit"
                        >
                          <FiEdit2 className="text-lg" />
                        </Button>
                      </Tooltip>
                      <Tooltip content="Delete">
                        <Button
                          size="sm"
                          variant="light"
                          color="danger"
                          isIconOnly
                          onPress={() => openDeleteModal(taxRate)}
                          aria-label="Delete"
                        >
                          <FiTrash2 className="text-lg" />
                        </Button>
                      </Tooltip>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {/* Add/Edit Modal */}
        <Modal isOpen={isModalOpen} onClose={handleCloseModal} size="3xl">
          <ModalContent>
            <form onSubmit={formik.handleSubmit}>
              <ModalHeader>
                {selectedTaxRate ? "Edit Tax Rate" : "Add Tax Rate"}
              </ModalHeader>
              <ModalBody>
                <div className="space-y-4">
                  {/* Country, Resident Country */}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <CountryAutocomplete
                      name="countryId"
                      label="Country"
                      value={
                        formik.values.countryId
                          ? parseInt(formik.values.countryId)
                          : undefined
                      }
                      onSelectionChange={(value) =>
                        formik.setFieldValue(
                          "countryId",
                          value !== null ? String(value) : "",
                        )
                      }
                      variant="flat"
                      isRequired
                      isInvalid={
                        formik.touched.countryId && !!formik.errors.countryId
                      }
                      errorMessage={
                        formik.touched.countryId
                          ? formik.errors.countryId
                          : undefined
                      }
                    />
                    <CountryAutocomplete
                      name="residentCountryId"
                      label="Resident Country"
                      value={
                        formik.values.residentCountryId
                          ? parseInt(formik.values.residentCountryId)
                          : undefined
                      }
                      onSelectionChange={(value) =>
                        formik.setFieldValue(
                          "residentCountryId",
                          value !== null ? String(value) : "",
                        )
                      }
                      variant="flat"
                    />
                  </div>

                  {/* Tax Asset, Legal Status */}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Autocomplete
                      label="Tax Asset"
                      placeholder="Select tax asset"
                      selectedKey={formik.values.taxAssetId || null}
                      onSelectionChange={(key) =>
                        formik.setFieldValue(
                          "taxAssetId",
                          key ? String(key) : "",
                        )
                      }
                      isInvalid={
                        formik.touched.taxAssetId && !!formik.errors.taxAssetId
                      }
                      errorMessage={
                        formik.touched.taxAssetId && formik.errors.taxAssetId
                      }
                      isRequired
                      defaultItems={taxAssets}
                    >
                      {(asset) => (
                        <AutocompleteItem
                          key={String(asset.Id)}
                          textValue={asset.Name}
                        >
                          {asset.Name}
                        </AutocompleteItem>
                      )}
                    </Autocomplete>

                    <Autocomplete
                      label="Legal Status"
                      placeholder="Select legal status"
                      selectedKey={formik.values.legalStatusId || null}
                      onSelectionChange={(key) =>
                        formik.setFieldValue(
                          "legalStatusId",
                          key ? String(key) : "",
                        )
                      }
                      isInvalid={
                        formik.touched.legalStatusId &&
                        !!formik.errors.legalStatusId
                      }
                      errorMessage={
                        formik.touched.legalStatusId &&
                        formik.errors.legalStatusId
                      }
                      isRequired
                      defaultItems={legalStatuses}
                    >
                      {(ls) => (
                        <AutocompleteItem
                          key={String(ls.Id)}
                          textValue={ls.Classification}
                        >
                          {ls.Classification}
                        </AutocompleteItem>
                      )}
                    </Autocomplete>
                  </div>

                  {/* Period and Dates */}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <Input
                      label="Period"
                      placeholder="e.g. 2024"
                      type="number"
                      name="period"
                      value={formik.values.period}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      isInvalid={
                        formik.touched.period && !!formik.errors.period
                      }
                      errorMessage={
                        formik.touched.period && formik.errors.period
                      }
                      isRequired
                    />
                    <Input
                      label="Start Date"
                      type="date"
                      name="startDate"
                      value={formik.values.startDate}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      isInvalid={
                        formik.touched.startDate && !!formik.errors.startDate
                      }
                      errorMessage={
                        formik.touched.startDate && formik.errors.startDate
                      }
                      isRequired
                    />
                    <Input
                      label="End Date"
                      type="date"
                      name="endDate"
                      value={formik.values.endDate}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      isInvalid={
                        formik.touched.endDate && !!formik.errors.endDate
                      }
                      errorMessage={
                        formik.touched.endDate && formik.errors.endDate
                      }
                    />
                  </div>

                  {/* Tax Rates */}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <Input
                      label="STCG Rate (%)"
                      placeholder="e.g. 15.00"
                      type="number"
                      step="0.01"
                      min="0"
                      max="999.99"
                      name="stcgRate"
                      value={formik.values.stcgRate}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      isInvalid={
                        formik.touched.stcgRate && !!formik.errors.stcgRate
                      }
                      errorMessage={
                        formik.touched.stcgRate && formik.errors.stcgRate
                      }
                      isRequired
                    />
                    <Input
                      label="LTCG Rate (%)"
                      placeholder="e.g. 10.00"
                      type="number"
                      step="0.01"
                      min="0"
                      max="999.99"
                      name="ltcgRate"
                      value={formik.values.ltcgRate}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      isInvalid={
                        formik.touched.ltcgRate && !!formik.errors.ltcgRate
                      }
                      errorMessage={
                        formik.touched.ltcgRate && formik.errors.ltcgRate
                      }
                      isRequired
                    />
                    <Input
                      label="Income Rate (%)"
                      placeholder="e.g. 30.00"
                      type="number"
                      step="0.01"
                      min="0"
                      max="999.99"
                      name="incomeRate"
                      value={formik.values.incomeRate}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      isInvalid={
                        formik.touched.incomeRate && !!formik.errors.incomeRate
                      }
                      errorMessage={
                        formik.touched.incomeRate && formik.errors.incomeRate
                      }
                      isRequired
                    />
                  </div>

                  {/* LTCG Exemption and Note */}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Input
                      label="LTCG Exemption"
                      placeholder="e.g. 100000"
                      type="number"
                      step="0.0001"
                      min="0"
                      name="ltcgExemption"
                      value={formik.values.ltcgExemption}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      isInvalid={
                        formik.touched.ltcgExemption &&
                        !!formik.errors.ltcgExemption
                      }
                      errorMessage={
                        formik.touched.ltcgExemption &&
                        formik.errors.ltcgExemption
                      }
                    />
                    <Input
                      label="Note"
                      placeholder="Optional note"
                      name="note"
                      value={formik.values.note}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                    />
                  </div>

                  {/* Toggles */}
                  <div className="flex gap-8">
                    <Switch
                      name="indexationApplicable"
                      isSelected={formik.values.indexationApplicable}
                      onValueChange={(value) =>
                        formik.setFieldValue("indexationApplicable", value)
                      }
                    >
                      Indexation Applicable
                    </Switch>
                    <Switch
                      name="isActive"
                      isSelected={formik.values.isActive}
                      onValueChange={(value) =>
                        formik.setFieldValue("isActive", value)
                      }
                    >
                      Active
                    </Switch>
                  </div>
                </div>
              </ModalBody>
              <ModalFooter>
                <Button variant="light" onPress={handleCloseModal}>
                  Cancel
                </Button>
                <Button
                  color="primary"
                  type="submit"
                  isLoading={formik.isSubmitting}
                >
                  {selectedTaxRate ? "Update" : "Create"}
                </Button>
              </ModalFooter>
            </form>
          </ModalContent>
        </Modal>

        {/* Delete Confirmation Modal */}
        <Modal isOpen={isDeleteModalOpen} onClose={closeDeleteModal}>
          <ModalContent>
            <ModalHeader>Confirm Delete</ModalHeader>
            <ModalBody>
              <p>
                Are you sure you want to delete tax rate{" "}
                <strong>#{selectedTaxRate?.Id}</strong>
                {selectedTaxRate?.Country
                  ? ` for ${selectedTaxRate.Country}`
                  : ""}
                ?
              </p>
            </ModalBody>
            <ModalFooter>
              <Button variant="light" onPress={closeDeleteModal}>
                Cancel
              </Button>
              <Button
                color="danger"
                onPress={handleDelete}
                isLoading={isDeleting}
              >
                Delete
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      </div>

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-4 right-4 z-50">
          <div
            className={`rounded-lg px-6 py-4 shadow-lg ${
              toast.type === "success"
                ? "bg-success text-success-foreground"
                : "bg-danger text-danger-foreground"
            }`}
          >
            {toast.message}
          </div>
        </div>
      )}
    </div>
  );
}
