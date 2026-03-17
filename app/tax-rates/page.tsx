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
import { Select, SelectItem } from "@heroui/select";
import { FiPlus, FiEdit2, FiTrash2 } from "react-icons/fi";
import { createClient } from "@/lib/supabase/client";
import { useFormik } from "formik";
import * as Yup from "yup";
import axiosInstance from "@/lib/axios";
import { formatEpochDate } from "@/utils/date";
import { CountryAutocomplete } from "@/components/CountryAutocomplete";
import { InvestmentSegmentAutocomplete } from "@/components/InvestmentSegmentAutocomplete";

interface TaxRate {
  Id: number;
  CountryId: number;
  CountryName: string;
  InvestmentId: number;
  InvestmentSegmentName: string;
  LegalStatusId: number;
  LegalStatusName: string;
  StgSttRate: number;
  StgNonSttRate: number;
  LtgSttRate: number;
  LtgNonSttRate: number;
  IncomeRate: number;
  IsCorporate: boolean;
  IsActive: boolean;
  StartDate: number;
  EndDate: number | null;
  CreatedOn: number;
}

interface LegalStatus {
  Id: number;
  Name: string;
  IsActive: boolean;
}

interface TaxRateFormData {
  countryId: string;
  investmentId: string;
  legalStatusId: string;
  stgSttRate: string;
  stgNonSttRate: string;
  ltgSttRate: string;
  ltgNonSttRate: string;
  incomeRate: string;
  isCorporate: boolean;
  isActive: boolean;
  startDate: string;
  endDate: string;
}

const taxRateValidationSchema = Yup.object({
  countryId: Yup.string().required("Country is required"),
  investmentId: Yup.string().required("Investment segment is required"),
  legalStatusId: Yup.string().required("Legal status is required"),
  stgSttRate: Yup.number()
    .typeError("Must be a number")
    .required("STG STT Rate is required")
    .min(0, "Must be 0 or greater")
    .max(999.99, "Must not exceed 999.99"),
  stgNonSttRate: Yup.number()
    .typeError("Must be a number")
    .required("STG Non-STT Rate is required")
    .min(0, "Must be 0 or greater")
    .max(999.99, "Must not exceed 999.99"),
  ltgSttRate: Yup.number()
    .typeError("Must be a number")
    .required("LTG STT Rate is required")
    .min(0, "Must be 0 or greater")
    .max(999.99, "Must not exceed 999.99"),
  ltgNonSttRate: Yup.number()
    .typeError("Must be a number")
    .required("LTG Non-STT Rate is required")
    .min(0, "Must be 0 or greater")
    .max(999.99, "Must not exceed 999.99"),
  incomeRate: Yup.number()
    .typeError("Must be a number")
    .required("Income Rate is required")
    .min(0, "Must be 0 or greater")
    .max(999.99, "Must not exceed 999.99"),
  isCorporate: Yup.boolean().required(),
  isActive: Yup.boolean(),
  startDate: Yup.string().required("Start date is required"),
  endDate: Yup.string(),
});

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
  const [legalStatuses, setLegalStatuses] = useState<LegalStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedTaxRate, setSelectedTaxRate] = useState<TaxRate | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const formik = useFormik<TaxRateFormData>({
    initialValues: {
      countryId: "",
      investmentId: "",
      legalStatusId: "",
      stgSttRate: "",
      stgNonSttRate: "",
      ltgSttRate: "",
      ltgNonSttRate: "",
      incomeRate: "",
      isCorporate: false,
      isActive: true,
      startDate: "",
      endDate: "",
    },
    validationSchema: taxRateValidationSchema,
    onSubmit: async (values) => {
      try {
        const payload = {
          countryId: parseInt(values.countryId),
          investmentId: parseInt(values.investmentId),
          legalStatusId: parseInt(values.legalStatusId),
          stgSttRate: parseFloat(values.stgSttRate),
          stgNonSttRate: parseFloat(values.stgNonSttRate),
          ltgSttRate: parseFloat(values.ltgSttRate),
          ltgNonSttRate: parseFloat(values.ltgNonSttRate),
          incomeRate: parseFloat(values.incomeRate),
          isCorporate: values.isCorporate,
          isActive: values.isActive,
          startDate: dateStringToEpoch(values.startDate),
          endDate: values.endDate ? dateStringToEpoch(values.endDate) : null,
        };

        const response = selectedTaxRate
          ? await axiosInstance.put(`/tax-rates/${selectedTaxRate.Id}`, payload)
          : await axiosInstance.post("/tax-rates", payload);

        const result = response.data;

        if (result.success) {
          handleCloseModal();
          fetchTaxRates();
        } else {
          console.error("Failed to save tax rate:", result.error);
          alert(`Error: ${result.message || result.error}`);
        }
      } catch (error) {
        console.error("Error saving tax rate:", error);
        alert("Failed to save tax rate");
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
        return;
      }

      fetchTaxRates();
      fetchLegalStatuses();
    };

    checkAuth();
  }, [router, supabase.auth]);

  const fetchTaxRates = async () => {
    try {
      setIsLoading(true);
      const response = await axiosInstance.get("/tax-rates");
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
    if (taxRate) {
      setSelectedTaxRate(taxRate);
      formik.setValues({
        countryId: String(taxRate.CountryId),
        investmentId: String(taxRate.InvestmentId),
        legalStatusId: String(taxRate.LegalStatusId),
        stgSttRate: String(taxRate.StgSttRate),
        stgNonSttRate: String(taxRate.StgNonSttRate),
        ltgSttRate: String(taxRate.LtgSttRate),
        ltgNonSttRate: String(taxRate.LtgNonSttRate),
        incomeRate: String(taxRate.IncomeRate),
        isCorporate: taxRate.IsCorporate,
        isActive: taxRate.IsActive,
        startDate: epochToDateString(taxRate.StartDate),
        endDate: taxRate.EndDate ? epochToDateString(taxRate.EndDate) : "",
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
      } else {
        console.error("Failed to delete tax rate:", result.error);
        alert(`Error: ${result.message || result.error}`);
      }
    } catch (error) {
      console.error("Error deleting tax rate:", error);
      alert("Failed to delete tax rate");
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

        {/* Tax Rates Table */}
        <Table
          aria-label="Tax rates table"
          className="max-h-[70vh] overflow-auto"
          isHeaderSticky
        >
          <TableHeader>
            <TableColumn>ID</TableColumn>
            <TableColumn>COUNTRY</TableColumn>
            <TableColumn>INVESTMENT SEGMENT</TableColumn>
            <TableColumn>LEGAL STATUS</TableColumn>
            <TableColumn>STG STT %</TableColumn>
            <TableColumn>STG NON-STT %</TableColumn>
            <TableColumn>LTG STT %</TableColumn>
            <TableColumn>LTG NON-STT %</TableColumn>
            <TableColumn>INCOME %</TableColumn>
            <TableColumn>CORPORATE</TableColumn>
            <TableColumn>START DATE</TableColumn>
            <TableColumn>END DATE</TableColumn>
            <TableColumn>STATUS</TableColumn>
            <TableColumn>ACTIONS</TableColumn>
          </TableHeader>
          <TableBody>
            {taxRates.map((taxRate) => (
              <TableRow key={taxRate.Id}>
                <TableCell>{taxRate.Id}</TableCell>
                <TableCell>{taxRate.CountryName || "-"}</TableCell>
                <TableCell>{taxRate.InvestmentSegmentName || "-"}</TableCell>
                <TableCell>{taxRate.LegalStatusName || "-"}</TableCell>
                <TableCell>{taxRate.StgSttRate}%</TableCell>
                <TableCell>{taxRate.StgNonSttRate}%</TableCell>
                <TableCell>{taxRate.LtgSttRate}%</TableCell>
                <TableCell>{taxRate.LtgNonSttRate}%</TableCell>
                <TableCell>{taxRate.IncomeRate}%</TableCell>
                <TableCell>
                  <Chip
                    color={taxRate.IsCorporate ? "secondary" : "default"}
                    size="sm"
                    variant="flat"
                  >
                    {taxRate.IsCorporate ? "Yes" : "No"}
                  </Chip>
                </TableCell>
                <TableCell>{formatEpochDate(taxRate.StartDate)}</TableCell>
                <TableCell>
                  {taxRate.EndDate ? formatEpochDate(taxRate.EndDate) : "-"}
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
                    <Button
                      size="sm"
                      variant="light"
                      color="primary"
                      isIconOnly
                      onPress={() => handleOpenModal(taxRate)}
                    >
                      <FiEdit2 />
                    </Button>
                    <Button
                      size="sm"
                      variant="light"
                      color="danger"
                      isIconOnly
                      onPress={() => openDeleteModal(taxRate)}
                    >
                      <FiTrash2 />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {/* Add/Edit Modal */}
        <Modal isOpen={isModalOpen} onClose={handleCloseModal} size="3xl">
          <ModalContent>
            <form onSubmit={formik.handleSubmit}>
              <ModalHeader>
                {selectedTaxRate ? "Edit Tax Rate" : "Add Tax Rate"}
              </ModalHeader>
              <ModalBody>
                <div className="space-y-4">
                  {/* Dropdowns row */}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
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

                    <InvestmentSegmentAutocomplete
                      name="investmentId"
                      label="Investment Segment"
                      value={
                        formik.values.investmentId
                          ? parseInt(formik.values.investmentId)
                          : undefined
                      }
                      onSelectionChange={(value) =>
                        formik.setFieldValue(
                          "investmentId",
                          value !== null ? String(value) : "",
                        )
                      }
                      variant="flat"
                      isRequired
                      isInvalid={
                        formik.touched.investmentId &&
                        !!formik.errors.investmentId
                      }
                      errorMessage={
                        formik.touched.investmentId
                          ? formik.errors.investmentId
                          : undefined
                      }
                    />

                    <Select
                      label="Legal Status"
                      placeholder="Select legal status"
                      selectedKeys={
                        formik.values.legalStatusId
                          ? new Set([formik.values.legalStatusId])
                          : new Set()
                      }
                      onSelectionChange={(keys) => {
                        const value = Array.from(keys)[0];
                        formik.setFieldValue(
                          "legalStatusId",
                          value ? String(value) : "",
                        );
                      }}
                      isInvalid={
                        formik.touched.legalStatusId &&
                        !!formik.errors.legalStatusId
                      }
                      errorMessage={
                        formik.touched.legalStatusId &&
                        formik.errors.legalStatusId
                      }
                      isRequired
                    >
                      {legalStatuses.map((ls) => (
                        <SelectItem key={String(ls.Id)}>{ls.Name}</SelectItem>
                      ))}
                    </Select>
                  </div>

                  {/* STG rates row */}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Input
                      label="STG STT Rate (%)"
                      placeholder="e.g. 15.00"
                      type="number"
                      step="0.01"
                      min="0"
                      max="999.99"
                      name="stgSttRate"
                      value={formik.values.stgSttRate}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      isInvalid={
                        formik.touched.stgSttRate && !!formik.errors.stgSttRate
                      }
                      errorMessage={
                        formik.touched.stgSttRate && formik.errors.stgSttRate
                      }
                      isRequired
                    />
                    <Input
                      label="STG Non-STT Rate (%)"
                      placeholder="e.g. 30.00"
                      type="number"
                      step="0.01"
                      min="0"
                      max="999.99"
                      name="stgNonSttRate"
                      value={formik.values.stgNonSttRate}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      isInvalid={
                        formik.touched.stgNonSttRate &&
                        !!formik.errors.stgNonSttRate
                      }
                      errorMessage={
                        formik.touched.stgNonSttRate &&
                        formik.errors.stgNonSttRate
                      }
                      isRequired
                    />
                  </div>

                  {/* LTG rates row */}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Input
                      label="LTG STT Rate (%)"
                      placeholder="e.g. 10.00"
                      type="number"
                      step="0.01"
                      min="0"
                      max="999.99"
                      name="ltgSttRate"
                      value={formik.values.ltgSttRate}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      isInvalid={
                        formik.touched.ltgSttRate && !!formik.errors.ltgSttRate
                      }
                      errorMessage={
                        formik.touched.ltgSttRate && formik.errors.ltgSttRate
                      }
                      isRequired
                    />
                    <Input
                      label="LTG Non-STT Rate (%)"
                      placeholder="e.g. 20.00"
                      type="number"
                      step="0.01"
                      min="0"
                      max="999.99"
                      name="ltgNonSttRate"
                      value={formik.values.ltgNonSttRate}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      isInvalid={
                        formik.touched.ltgNonSttRate &&
                        !!formik.errors.ltgNonSttRate
                      }
                      errorMessage={
                        formik.touched.ltgNonSttRate &&
                        formik.errors.ltgNonSttRate
                      }
                      isRequired
                    />
                  </div>

                  {/* Income rate and dates row */}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
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

                  {/* Toggles row */}
                  <div className="flex gap-8">
                    <Switch
                      name="isCorporate"
                      isSelected={formik.values.isCorporate}
                      onValueChange={(value) =>
                        formik.setFieldValue("isCorporate", value)
                      }
                    >
                      Is Corporate
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
                {selectedTaxRate?.CountryName
                  ? ` for ${selectedTaxRate.CountryName}`
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
    </div>
  );
}
