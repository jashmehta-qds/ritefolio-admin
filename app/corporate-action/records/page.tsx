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
import { Select, SelectItem } from "@heroui/select";
import { Textarea } from "@heroui/input";
import { Switch } from "@heroui/switch";
import { Tooltip } from "@heroui/tooltip";
import { Pagination } from "@heroui/pagination";
import {
  FiEye,
  FiEdit2,
  FiPlus,
  FiTrash2,
  FiDownload,
  FiSearch,
  FiX,
} from "react-icons/fi";
import { createClient } from "@/lib/supabase/client";
import { v4 as uuidv4 } from "uuid";
import axiosInstance from "@/lib/axios";
import { formatEpochDate, dateToEpoch } from "@/utils/date";
import { StockAutocomplete } from "@/components/StockAutocomplete";

interface CorporateActionRecord {
  Id: string;
  SourceStockId: string;
  Isin: string;
  Symbol: string;
  StockName: string;
  CorporateActionTypeId: number;
  CorporateActionName: string;
  ExDate: number;
  RecordDate: number;
  AllotmentDate: number | null;
  Remark: string | null;
  IsActive: boolean;
  CreatedOn: number;
  UpdatedOn: number | null;
}

interface CorporateActionDetail {
  Id: string;
  CorporateActionRecordId: string;
  TargetStockId: string | null;
  Isin: string | null;
  Symbol: string | null;
  StockName: string | null;
  RatioQuantityHeld: number;
  RatioQuantityEntitled: number;
  RatioBookValueHeld: number | null;
  RatioBookValueEntitled: number | null;
  TargetSaleRow: boolean | null;
  ReferenceDocUrl: string | null;
  Remark: string | null;
  IsActive: boolean;
  CreatedOn: number;
  UpdatedOn: number | null;
}

interface CorporateActionType {
  Id: number;
  Code: string;
  Name: string;
  IsActive: boolean;
}

interface NewDetailRow {
  tempId: string;
  targetStockId: string | null;
  ratioQuantityHeld: number;
  ratioQuantityEntitled: number;
  ratioBookValueHeld: number | null;
  ratioBookValueEntitled: number | null;
  targetSaleRow: boolean;
  remark: string | null;
}

interface NewCorporateAction {
  sourceStockId: string;
  corpActionTypeId: number;
  exDate: number;
  recordDate: number;
  allotmentDate: number | null;
  remark: string | null;
  details: NewDetailRow[];
}

interface PaginationInfo {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export default function CorporateActionRecordsPage() {
  const [records, setRecords] = useState<CorporateActionRecord[]>([]);
  const [selectedRecord, setSelectedRecord] =
    useState<CorporateActionRecord | null>(null);
  const [details, setDetails] = useState<CorporateActionDetail[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [pagination, setPagination] = useState<PaginationInfo>({
    total: 0,
    page: 1,
    pageSize: 50,
    totalPages: 1,
    hasNextPage: false,
    hasPreviousPage: false,
  });

  // Date range filter states
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [tempStartDate, setTempStartDate] = useState<string>("");
  const [tempEndDate, setTempEndDate] = useState<string>("");

  // Edit states
  const [isEditRecordModalOpen, setIsEditRecordModalOpen] = useState(false);
  const [isEditDetailModalOpen, setIsEditDetailModalOpen] = useState(false);
  const [isAddDetailModalOpen, setIsAddDetailModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] =
    useState<CorporateActionRecord | null>(null);
  const [editingDetail, setEditingDetail] =
    useState<CorporateActionDetail | null>(null);
  const [newDetail, setNewDetail] = useState<{
    targetStockId: string | null;
    ratioQuantityHeld: number;
    ratioQuantityEntitled: number;
    ratioBookValueHeld: number | null;
    ratioBookValueEntitled: number | null;
    targetSaleRow: boolean;
    referenceDocUrl: string | null;
    remark: string | null;
  }>({
    targetStockId: null,
    ratioQuantityHeld: 0,
    ratioQuantityEntitled: 0,
    ratioBookValueHeld: null,
    ratioBookValueEntitled: null,
    targetSaleRow: false,
    referenceDocUrl: null,
    remark: null,
  });
  const [corporateActionTypes, setCorporateActionTypes] = useState<
    CorporateActionType[]
  >([]);
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);
  const [initialStockName, setInitialStockName] = useState<string>("");
  const [initialTargetStockName, setInitialTargetStockName] =
    useState<string>("");

  // Delete states
  const [isDeleteRecordModalOpen, setIsDeleteRecordModalOpen] = useState(false);
  const [isDeleteDetailModalOpen, setIsDeleteDetailModalOpen] = useState(false);
  const [deletingRecord, setDeletingRecord] =
    useState<CorporateActionRecord | null>(null);
  const [deletingDetail, setDeletingDetail] =
    useState<CorporateActionDetail | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Add states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newAction, setNewAction] = useState<NewCorporateAction>({
    sourceStockId: "",
    corpActionTypeId: 0,
    exDate: 0,
    recordDate: 0,
    allotmentDate: null,
    remark: null,
    details: [],
  });
  const [targetStockNames, setTargetStockNames] = useState<
    Record<string, string>
  >({});

  const router = useRouter();
  const supabase = createClient();

  // Helper function to safely format numbers
  const formatNumber = (value: any, decimals: number = 4): string => {
    if (value === null || value === undefined) return "-";
    const num = typeof value === "string" ? parseFloat(value) : value;
    return isNaN(num) ? "-" : num.toFixed(decimals);
  };

  // Show toast notification
  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/");
        return;
      }

      // Initialize default date range (last 2 years)
      const now = new Date();
      const twoYearsAgo = new Date(
        now.getFullYear() - 2,
        now.getMonth(),
        now.getDate()
      );
      setTempStartDate(twoYearsAgo.toISOString().split("T")[0]);
      setTempEndDate(now.toISOString().split("T")[0]);
      setStartDate(twoYearsAgo.toISOString().split("T")[0]);
      setEndDate(now.toISOString().split("T")[0]);

      fetchCorporateActionTypes();
    };

    checkAuth();
  }, [router, supabase.auth]);

  // Fetch records when page, pageSize, or date filters change
  useEffect(() => {
    if (startDate && endDate) {
      fetchRecords();
    }
  }, [currentPage, pageSize, startDate, endDate]);

  const fetchRecords = async () => {
    try {
      setIsLoading(true);

      // Build query parameters
      const params = new URLSearchParams();
      params.append("rowStart", ((currentPage - 1) * pageSize).toString());
      params.append("rowLimit", pageSize.toString());

      if (startDate) {
        const startEpoch = dateToEpoch(new Date(startDate));
        params.append("startDate", startEpoch.toString());
      }

      if (endDate) {
        const endEpoch = dateToEpoch(new Date(endDate));
        params.append("endDate", endEpoch.toString());
      }

      const response = await axiosInstance.get(
        `/corporate-action/records?${params.toString()}`
      );
      const result = response.data;

      if (result.success) {
        setRecords(result.data);
        if (result.pagination) {
          setPagination(result.pagination);
        }
      } else {
        console.error(
          "Failed to fetch corporate action records:",
          result.error
        );
        showToast("Failed to fetch records", "error");
      }
    } catch (error) {
      console.error("Error fetching corporate action records:", error);
      showToast("Error fetching records", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyFilters = () => {
    setStartDate(tempStartDate);
    setEndDate(tempEndDate);
    setCurrentPage(1); // Reset to first page when filters change
  };

  const handleClearFilters = () => {
    const now = new Date();
    const twoYearsAgo = new Date(
      now.getFullYear() - 2,
      now.getMonth(),
      now.getDate()
    );
    const defaultStart = twoYearsAgo.toISOString().split("T")[0];
    const defaultEnd = now.toISOString().split("T")[0];

    setTempStartDate(defaultStart);
    setTempEndDate(defaultEnd);
    setStartDate(defaultStart);
    setEndDate(defaultEnd);
    setCurrentPage(1);
  };

  const fetchCorporateActionTypes = async () => {
    try {
      const response = await axiosInstance.get("/corporate-action/types");
      const result = response.data;

      if (result.success) {
        setCorporateActionTypes(
          result.data.filter((type: CorporateActionType) => type.IsActive)
        );
      }
    } catch (error) {
      console.error("Error fetching corporate action types:", error);
    }
  };

  const fetchDetails = async (recordId: string) => {
    try {
      setIsLoadingDetails(true);
      const response = await axiosInstance.get(
        `/corporate-action/records/${recordId}/details`
      );
      const result = response.data;

      if (result.success) {
        setDetails(result.data);
      } else {
        console.error(
          "Failed to fetch corporate action details:",
          result.error
        );
      }
    } catch (error) {
      console.error("Error fetching corporate action details:", error);
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const handleViewDetails = async (record: CorporateActionRecord) => {
    setSelectedRecord(record);
    setIsDetailsModalOpen(true);
    await fetchDetails(record.Id);
  };

  const handleCloseDetailsModal = () => {
    setIsDetailsModalOpen(false);
    setSelectedRecord(null);
    setDetails([]);
  };

  const handleDownloadReferenceDoc = (url: string, detailId: string) => {
    try {
      // Open the URL in a new tab to download
      window.open(url, "_blank");
    } catch (error) {
      console.error("Error downloading reference document:", error);
      showToast("Error downloading reference document", "error");
    }
  };

  // Edit Record Handlers
  const handleEditRecord = async (record: CorporateActionRecord) => {
    setEditingRecord({ ...record });

    // Fetch the stock details to get the stock name for the autocomplete
    try {
      const response = await axiosInstance.get(
        `/stocks?stockId=${record.SourceStockId}`
      );
      if (
        response.data.success &&
        response.data.data &&
        response.data.data.length > 0
      ) {
        setInitialStockName(response.data.data[0].Name);
      } else {
        setInitialStockName("");
      }
    } catch (error) {
      console.error("Error fetching stock details:", error);
      setInitialStockName("");
    }

    setIsEditRecordModalOpen(true);
  };

  const handleSaveRecord = async () => {
    if (!editingRecord) return;

    try {
      setIsSaving(true);
      const response = await axiosInstance.put(
        `/corporate-action/records/${editingRecord.Id}`,
        {
          sourceStockId: editingRecord.SourceStockId,
          corpActionTypeId: editingRecord.CorporateActionTypeId,
          exDate: editingRecord.ExDate,
          recordDate: editingRecord.RecordDate,
          allotmentDate: editingRecord.AllotmentDate,
          remark: editingRecord.Remark,
          isActive: editingRecord.IsActive,
        }
      );

      if (response.data.success) {
        showToast("Record updated successfully", "success");
        setIsEditRecordModalOpen(false);
        await fetchRecords();
      } else {
        showToast("Failed to update record", "error");
      }
    } catch (error) {
      console.error("Error updating record:", error);
      showToast("Error updating record", "error");
    } finally {
      setIsSaving(false);
    }
  };

  // Edit Detail Handlers
  const handleEditDetail = async (detail: CorporateActionDetail) => {
    setEditingDetail({ ...detail });

    // Fetch the target stock details to get the stock name for the autocomplete
    if (detail.TargetStockId) {
      try {
        const response = await axiosInstance.get(
          `/stocks?stockId=${detail.TargetStockId}`
        );
        if (
          response.data.success &&
          response.data.data &&
          response.data.data.length > 0
        ) {
          setInitialTargetStockName(response.data.data[0].Name);
        } else {
          setInitialTargetStockName("");
        }
      } catch (error) {
        console.error("Error fetching target stock details:", error);
        setInitialTargetStockName("");
      }
    } else {
      setInitialTargetStockName("");
    }

    setIsEditDetailModalOpen(true);
  };

  const handleSaveDetail = async () => {
    if (!editingDetail || !selectedRecord) return;

    try {
      setIsSaving(true);
      const response = await axiosInstance.put(
        `/corporate-action/records/${selectedRecord.Id}/details/${editingDetail.Id}`,
        {
          actionRecordId: editingDetail.CorporateActionRecordId,
          targetStockId: editingDetail.TargetStockId,
          ratioQuantityHeld: Number(editingDetail.RatioQuantityHeld),
          ratioQuantityEntitled: Number(editingDetail.RatioQuantityEntitled),
          ratioBookValueHeld: editingDetail.RatioBookValueHeld
            ? Number(editingDetail.RatioBookValueHeld)
            : null,
          ratioBookValueEntitled: editingDetail.RatioBookValueEntitled
            ? Number(editingDetail.RatioBookValueEntitled)
            : null,
          targetSaleRow: editingDetail.TargetSaleRow,
          remark: editingDetail.Remark,
          isActive: editingDetail.IsActive,
        }
      );

      if (response.data.success) {
        showToast("Detail updated successfully", "success");
        setIsEditDetailModalOpen(false);
        await fetchDetails(selectedRecord.Id);
      } else {
        showToast("Failed to update detail", "error");
      }
    } catch (error) {
      console.error("Error updating detail:", error);
      showToast("Error updating detail", "error");
    } finally {
      setIsSaving(false);
    }
  };

  // Add Detail Handlers
  const handleOpenAddDetailModal = () => {
    setNewDetail({
      targetStockId: null,
      ratioQuantityHeld: 0,
      ratioQuantityEntitled: 0,
      ratioBookValueHeld: null,
      ratioBookValueEntitled: null,
      targetSaleRow: false,
      referenceDocUrl: null,
      remark: null,
    });
    setInitialTargetStockName("");
    setIsAddDetailModalOpen(true);
  };

  const handleSaveNewDetail = async () => {
    if (!selectedRecord) return;

    try {
      // Validate required fields
      if (!newDetail.ratioQuantityHeld || !newDetail.ratioQuantityEntitled) {
        showToast("Please fill in all required ratio quantities", "error");
        return;
      }

      setIsSaving(true);
      const response = await axiosInstance.post(
        `/corporate-action/records/${selectedRecord.Id}/details`,
        {
          targetStockId: newDetail.targetStockId,
          ratioQuantityHeld: Number(newDetail.ratioQuantityHeld),
          ratioQuantityEntitled: Number(newDetail.ratioQuantityEntitled),
          ratioBookValueHeld: newDetail.ratioBookValueHeld
            ? Number(newDetail.ratioBookValueHeld)
            : null,
          ratioBookValueEntitled: newDetail.ratioBookValueEntitled
            ? Number(newDetail.ratioBookValueEntitled)
            : null,
          targetSaleRow: newDetail.targetSaleRow,
          referenceDocUrl: newDetail.referenceDocUrl,
          remark: newDetail.remark,
          isActive: true,
        }
      );

      if (response.data.success) {
        showToast("Detail added successfully", "success");
        setIsAddDetailModalOpen(false);
        await fetchDetails(selectedRecord.Id);
      } else {
        showToast("Failed to add detail", "error");
      }
    } catch (error) {
      console.error("Error adding detail:", error);
      showToast("Error adding detail", "error");
    } finally {
      setIsSaving(false);
    }
  };

  // Add Corporate Action Handlers
  const handleOpenAddModal = () => {
    // Reset form
    setNewAction({
      sourceStockId: "",
      corpActionTypeId: 0,
      exDate: 0,
      recordDate: 0,
      allotmentDate: null,
      remark: null,
      details: [],
    });
    setInitialStockName("");
    setTargetStockNames({});
    setIsAddModalOpen(true);
  };

  const handleAddDetailRow = () => {
    const newDetail: NewDetailRow = {
      tempId: uuidv4(),
      targetStockId: null,
      ratioQuantityHeld: 0,
      ratioQuantityEntitled: 0,
      ratioBookValueHeld: null,
      ratioBookValueEntitled: null,
      targetSaleRow: false,
      remark: null,
    };
    setNewAction({
      ...newAction,
      details: [...newAction.details, newDetail],
    });
  };

  const handleRemoveDetailRow = (tempId: string) => {
    setNewAction({
      ...newAction,
      details: newAction.details.filter((d) => d.tempId !== tempId),
    });
    // Clean up stock name mapping
    const { [tempId]: _, ...rest } = targetStockNames;
    setTargetStockNames(rest);
  };

  const handleUpdateDetailRow = (
    tempId: string,
    field: keyof NewDetailRow,
    value: any
  ) => {
    setNewAction({
      ...newAction,
      details: newAction.details.map((d) =>
        d.tempId === tempId ? { ...d, [field]: value } : d
      ),
    });
  };

  const handleSaveNewAction = async () => {
    try {
      // Validate required fields
      if (
        !newAction.sourceStockId ||
        !newAction.corpActionTypeId ||
        !newAction.exDate ||
        !newAction.recordDate
      ) {
        showToast("Please fill in all required fields", "error");
        return;
      }

      if (newAction.details.length === 0) {
        showToast("Please add at least one detail row", "error");
        return;
      }

      // Validate each detail row
      for (const detail of newAction.details) {
        if (!detail.ratioQuantityHeld || !detail.ratioQuantityEntitled) {
          showToast(
            "Please fill in ratio quantities for all detail rows",
            "error"
          );
          return;
        }
      }

      setIsSaving(true);

      const response = await axiosInstance.post("/corporate-action/records", {
        sourceStockId: newAction.sourceStockId,
        corpActionTypeId: newAction.corpActionTypeId,
        exDate: newAction.exDate,
        recordDate: newAction.recordDate,
        allotmentDate: newAction.allotmentDate,
        remark: newAction.remark,
        details: newAction.details.map((d) => ({
          targetStockId: d.targetStockId,
          ratioQuantityHeld: d.ratioQuantityHeld,
          ratioQuantityEntitled: d.ratioQuantityEntitled,
          ratioBookValueHeld: d.ratioBookValueHeld,
          ratioBookValueEntitled: d.ratioBookValueEntitled,
          targetSaleRow: d.targetSaleRow,
          remark: d.remark,
        })),
      });

      if (response.data.success) {
        showToast("Corporate action added successfully", "success");
        setIsAddModalOpen(false);
        await fetchRecords();
      } else {
        showToast("Failed to add corporate action", "error");
      }
    } catch (error) {
      console.error("Error adding corporate action:", error);
      showToast("Error adding corporate action", "error");
    } finally {
      setIsSaving(false);
    }
  };

  // Delete Record Handlers
  const handleDeleteRecord = (record: CorporateActionRecord) => {
    setDeletingRecord(record);
    setIsDeleteRecordModalOpen(true);
  };

  const handleConfirmDeleteRecord = async () => {
    if (!deletingRecord) return;

    try {
      setIsDeleting(true);
      const response = await axiosInstance.delete(
        `/corporate-action/records/${deletingRecord.Id}`
      );

      if (response.data.success) {
        showToast("Record deleted successfully", "success");
        setIsDeleteRecordModalOpen(false);
        setDeletingRecord(null);
        await fetchRecords();
      } else {
        showToast(response.data.message || "Failed to delete record", "error");
      }
    } catch (error: any) {
      console.error("Error deleting record:", error);
      const errorMessage = error.response?.data?.message || "Error deleting record";
      showToast(errorMessage, "error");
    } finally {
      setIsDeleting(false);
    }
  };

  // Delete Detail Handlers
  const handleDeleteDetail = (detail: CorporateActionDetail) => {
    setDeletingDetail(detail);
    setIsDeleteDetailModalOpen(true);
  };

  const handleConfirmDeleteDetail = async () => {
    if (!deletingDetail || !selectedRecord) return;

    try {
      setIsDeleting(true);
      const response = await axiosInstance.delete(
        `/corporate-action/records/${selectedRecord.Id}/details/${deletingDetail.Id}`
      );

      if (response.data.success) {
        showToast("Detail deleted successfully", "success");
        setIsDeleteDetailModalOpen(false);
        setDeletingDetail(null);
        await fetchDetails(selectedRecord.Id);
      } else {
        showToast(response.data.message || "Failed to delete detail", "error");
      }
    } catch (error: any) {
      console.error("Error deleting detail:", error);
      const errorMessage = error.response?.data?.message || "Error deleting detail";
      showToast(errorMessage, "error");
    } finally {
      setIsDeleting(false);
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
              Corporate Action Records
            </h1>
            <p className="mt-2 text-default-500">
              View corporate action records and their details
            </p>
          </div>
          <Button
            color="primary"
            startContent={<FiPlus />}
            onPress={handleOpenAddModal}
          >
            Add Corporate Action
          </Button>
        </div>

        {/* Filters */}
        <div className="mb-6 rounded-lg border border-default-200 bg-default-50 p-4">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-foreground">Filters</h3>
            <div className="text-sm text-default-500">
              Showing {records.length} of {pagination.total} records
            </div>
          </div>
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex-1 min-w-[200px]">
              <Input
                label="Start Date"
                type="date"
                value={tempStartDate}
                onValueChange={setTempStartDate}
                max={new Date().toISOString().split("T")[0]}
                size="sm"
              />
            </div>
            <div className="flex-1 min-w-[200px]">
              <Input
                label="End Date"
                type="date"
                value={tempEndDate}
                onValueChange={setTempEndDate}
                max={new Date().toISOString().split("T")[0]}
                size="sm"
              />
            </div>
            <div className="flex gap-2">
              <Button
                color="primary"
                startContent={<FiSearch />}
                onPress={handleApplyFilters}
                size="sm"
              >
                Apply
              </Button>
              <Button
                variant="flat"
                startContent={<FiX />}
                onPress={handleClearFilters}
                size="sm"
              >
                Clear
              </Button>
            </div>
          </div>
        </div>

        {/* Records Table */}
        <div className="max-h-[calc(100vh-400px)] overflow-auto">
          <Table aria-label="Corporate action records table" isHeaderSticky>
            <TableHeader>
              <TableColumn>ISIN</TableColumn>
              <TableColumn>SYMBOL</TableColumn>
              <TableColumn>STOCK NAME</TableColumn>
              <TableColumn>ACTION TYPE</TableColumn>
              <TableColumn>EX DATE</TableColumn>
              <TableColumn>RECORD DATE</TableColumn>
              <TableColumn>ALLOTMENT DATE</TableColumn>
              <TableColumn>STATUS</TableColumn>
              <TableColumn>ACTIONS</TableColumn>
            </TableHeader>
            <TableBody>
              {records.map((record) => (
                <TableRow key={record.Id}>
                  <TableCell>{record.Isin}</TableCell>
                  <TableCell>{record.Symbol}</TableCell>
                  <TableCell>{record.StockName}</TableCell>
                  <TableCell>
                    <Chip size="sm" variant="dot" color="primary">
                      {record.CorporateActionName}
                    </Chip>
                  </TableCell>
                  <TableCell>{formatEpochDate(record.ExDate)}</TableCell>
                  <TableCell>{formatEpochDate(record.RecordDate)}</TableCell>
                  <TableCell>{formatEpochDate(record.AllotmentDate)}</TableCell>
                  <TableCell>
                    <Chip
                      color={record.IsActive ? "success" : "default"}
                      size="sm"
                      variant="flat"
                    >
                      {record.IsActive ? "Active" : "Inactive"}
                    </Chip>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Tooltip content="View Details">
                        <Button
                          size="sm"
                          variant="light"
                          isIconOnly
                          onPress={() => handleViewDetails(record)}
                        >
                          <FiEye />
                        </Button>
                      </Tooltip>
                      <Tooltip content="Edit Record">
                        <Button
                          size="sm"
                          variant="light"
                          isIconOnly
                          onPress={() => handleEditRecord(record)}
                        >
                          <FiEdit2 />
                        </Button>
                      </Tooltip>
                      <Tooltip content="Delete Record">
                        <Button
                          size="sm"
                          variant="light"
                          isIconOnly
                          color="danger"
                          onPress={() => handleDeleteRecord(record)}
                        >
                          <FiTrash2 />
                        </Button>
                      </Tooltip>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {records.length > 0 && (
          <div className="mt-4 flex w-full items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm text-default-500">Rows per page:</span>
              <Select
                size="sm"
                selectedKeys={[pageSize.toString()]}
                onSelectionChange={(keys) => {
                  const value = Array.from(keys)[0] as string;
                  setPageSize(parseInt(value));
                  setCurrentPage(1);
                }}
                className="w-20"
                aria-label="Rows per page"
              >
                <SelectItem key="10">10</SelectItem>
                <SelectItem key="25">25</SelectItem>
                <SelectItem key="50">50</SelectItem>
                <SelectItem key="100">100</SelectItem>
              </Select>
            </div>
            <Pagination
              isCompact
              showControls
              showShadow
              color="primary"
              total={pagination.totalPages}
              page={currentPage}
              onChange={setCurrentPage}
            />
          </div>
        )}

        {/* Details Modal */}
        <Modal
          isOpen={isDetailsModalOpen}
          onClose={handleCloseDetailsModal}
          size="5xl"
          scrollBehavior="inside"
        >
          <ModalContent>
            <ModalHeader className="flex flex-col gap-1">
              <div className="text-lg font-bold">Corporate Action Details</div>
              {selectedRecord && (
                <div className="text-sm font-normal text-default-500">
                  {selectedRecord.Symbol} - {selectedRecord.StockName} (
                  {selectedRecord.CorporateActionName})
                </div>
              )}
            </ModalHeader>
            <ModalBody>
              {isLoadingDetails ? (
                <div className="flex items-center justify-center py-8">
                  <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" />
                </div>
              ) : (
                <>
                  {/* Record Information */}
                  {selectedRecord && (
                    <div className="mb-6 space-y-4 rounded-lg bg-default-100 p-4">
                      <h3 className="text-md font-semibold">
                        Record Information
                      </h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-default-500">ISIN</p>
                          <p className="font-medium">{selectedRecord.Isin}</p>
                        </div>
                        <div>
                          <p className="text-sm text-default-500">Symbol</p>
                          <p className="font-medium">{selectedRecord.Symbol}</p>
                        </div>
                        <div>
                          <p className="text-sm text-default-500">Ex Date</p>
                          <p className="font-medium">
                            {formatEpochDate(selectedRecord.ExDate)}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-default-500">
                            Record Date
                          </p>
                          <p className="font-medium">
                            {formatEpochDate(selectedRecord.RecordDate)}
                          </p>
                        </div>
                        {selectedRecord.AllotmentDate && (
                          <div>
                            <p className="text-sm text-default-500">
                              Allotment Date
                            </p>
                            <p className="font-medium">
                              {formatEpochDate(selectedRecord.AllotmentDate)}
                            </p>
                          </div>
                        )}
                        {selectedRecord.Remark && (
                          <div className="col-span-2">
                            <p className="text-sm text-default-500">Remark</p>
                            <p className="font-medium">
                              {selectedRecord.Remark}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Details Table */}
                  <div>
                    <div className="mb-4 flex items-center justify-between">
                      <h3 className="text-md font-semibold">Action Details</h3>
                      <Button
                        size="sm"
                        color="primary"
                        variant="bordered"
                        startContent={<FiPlus />}
                        onPress={handleOpenAddDetailModal}
                      >
                        Add Detail Row
                      </Button>
                    </div>
                    {details.length === 0 ? (
                      <div className="py-8 text-center text-default-500">
                        No details available for this record
                      </div>
                    ) : (
                      <Table aria-label="Corporate action details table">
                        <TableHeader>
                          <TableColumn>TARGET STOCK</TableColumn>
                          <TableColumn>QTY HELD</TableColumn>
                          <TableColumn>QTY ENTITLED</TableColumn>
                          <TableColumn>BOOK VALUE HELD</TableColumn>
                          <TableColumn>BOOK VALUE ENTITLED</TableColumn>
                          <TableColumn>SALE ROW</TableColumn>
                          <TableColumn>STATUS</TableColumn>
                          <TableColumn>ACTIONS</TableColumn>
                        </TableHeader>
                        <TableBody>
                          {details.map((detail) => (
                            <TableRow key={detail.Id}>
                              <TableCell>
                                {detail.Symbol ? (
                                  <div>
                                    <div className="font-medium">
                                      {detail.Symbol}
                                    </div>
                                    <div className="text-xs text-default-500">
                                      {detail.StockName}
                                    </div>
                                  </div>
                                ) : (
                                  "-"
                                )}
                              </TableCell>
                              <TableCell>
                                {formatNumber(detail.RatioQuantityHeld)}
                              </TableCell>
                              <TableCell>
                                {formatNumber(detail.RatioQuantityEntitled)}
                              </TableCell>
                              <TableCell>
                                {formatNumber(detail.RatioBookValueHeld)}
                              </TableCell>
                              <TableCell>
                                {formatNumber(detail.RatioBookValueEntitled)}
                              </TableCell>
                              <TableCell>
                                {detail.TargetSaleRow !== null ? (
                                  <Chip
                                    color={
                                      detail.TargetSaleRow
                                        ? "warning"
                                        : "default"
                                    }
                                    size="sm"
                                    variant="flat"
                                  >
                                    {detail.TargetSaleRow ? "Yes" : "No"}
                                  </Chip>
                                ) : (
                                  "-"
                                )}
                              </TableCell>
                              <TableCell>
                                <Chip
                                  color={
                                    detail.IsActive ? "success" : "default"
                                  }
                                  size="sm"
                                  variant="flat"
                                >
                                  {detail.IsActive ? "Active" : "Inactive"}
                                </Chip>
                              </TableCell>
                              <TableCell>
                                <div className="flex gap-2">
                                  {detail.ReferenceDocUrl && (
                                    <Tooltip content="Download Reference Document">
                                      <Button
                                        size="sm"
                                        variant="light"
                                        isIconOnly
                                        onPress={() =>
                                          handleDownloadReferenceDoc(
                                            detail.ReferenceDocUrl!,
                                            detail.Id
                                          )
                                        }
                                      >
                                        <FiDownload />
                                      </Button>
                                    </Tooltip>
                                  )}
                                  <Tooltip content="Edit Detail">
                                    <Button
                                      size="sm"
                                      variant="light"
                                      isIconOnly
                                      onPress={() => handleEditDetail(detail)}
                                    >
                                      <FiEdit2 />
                                    </Button>
                                  </Tooltip>
                                  <Tooltip content="Delete Detail">
                                    <Button
                                      size="sm"
                                      variant="light"
                                      isIconOnly
                                      color="danger"
                                      onPress={() => handleDeleteDetail(detail)}
                                    >
                                      <FiTrash2 />
                                    </Button>
                                  </Tooltip>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </div>
                </>
              )}
            </ModalBody>
            <ModalFooter>
              <Button variant="light" onPress={handleCloseDetailsModal}>
                Close
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>

        {/* Edit Record Modal */}
        <Modal
          isOpen={isEditRecordModalOpen}
          onClose={() => setIsEditRecordModalOpen(false)}
          size="3xl"
          scrollBehavior="inside"
        >
          <ModalContent>
            <ModalHeader>Edit Corporate Action Record</ModalHeader>
            <ModalBody>
              {editingRecord && (
                <div className="space-y-4">
                  <StockAutocomplete
                    name="sourceStock"
                    label="Source Stock"
                    placeholder="Search by stock name, symbol, ISIN, or BSE code"
                    value={editingRecord.SourceStockId}
                    onSelectionChange={(stockId, stock) => {
                      if (stockId && stock) {
                        setEditingRecord({
                          ...editingRecord,
                          SourceStockId: stockId,
                        });
                        setInitialStockName(stock.Name);
                      }
                    }}
                    initialStockName={initialStockName}
                    isRequired
                  />

                  <Select
                    label="Corporate Action Type"
                    selectedKeys={[
                      editingRecord.CorporateActionTypeId.toString(),
                    ]}
                    onSelectionChange={(keys) => {
                      const value = Array.from(keys)[0] as string;
                      setEditingRecord({
                        ...editingRecord,
                        CorporateActionTypeId: parseInt(value),
                      });
                    }}
                    isRequired
                  >
                    {corporateActionTypes.map((type) => (
                      <SelectItem key={type.Id.toString()}>
                        {type.Name}
                      </SelectItem>
                    ))}
                  </Select>

                  <Input
                    label="Ex Date"
                    type="date"
                    value={
                      editingRecord.ExDate
                        ? new Date(editingRecord.ExDate * 1000)
                            .toISOString()
                            .split("T")[0]
                        : ""
                    }
                    onValueChange={(value) => {
                      const date = new Date(value);
                      setEditingRecord({
                        ...editingRecord,
                        ExDate: dateToEpoch(date),
                      });
                    }}
                    isRequired
                  />

                  <Input
                    label="Record Date"
                    type="date"
                    value={
                      editingRecord.RecordDate
                        ? new Date(editingRecord.RecordDate * 1000)
                            .toISOString()
                            .split("T")[0]
                        : ""
                    }
                    onValueChange={(value) => {
                      const date = new Date(value);
                      setEditingRecord({
                        ...editingRecord,
                        RecordDate: dateToEpoch(date),
                      });
                    }}
                    isRequired
                  />

                  <Input
                    label="Allotment Date"
                    type="date"
                    value={
                      editingRecord.AllotmentDate
                        ? new Date(editingRecord.AllotmentDate * 1000)
                            .toISOString()
                            .split("T")[0]
                        : ""
                    }
                    onValueChange={(value) => {
                      const date = value ? new Date(value) : null;
                      setEditingRecord({
                        ...editingRecord,
                        AllotmentDate: date ? dateToEpoch(date) : null,
                      });
                    }}
                  />

                  <Textarea
                    label="Remark"
                    value={editingRecord.Remark || ""}
                    onValueChange={(value) =>
                      setEditingRecord({ ...editingRecord, Remark: value })
                    }
                  />

                  <Switch
                    isSelected={editingRecord.IsActive}
                    onValueChange={(value) =>
                      setEditingRecord({ ...editingRecord, IsActive: value })
                    }
                  >
                    Active
                  </Switch>
                </div>
              )}
            </ModalBody>
            <ModalFooter>
              <Button
                variant="light"
                onPress={() => setIsEditRecordModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                color="primary"
                onPress={handleSaveRecord}
                isLoading={isSaving}
              >
                Save Changes
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>

        {/* Edit Detail Modal */}
        <Modal
          isOpen={isEditDetailModalOpen}
          onClose={() => setIsEditDetailModalOpen(false)}
          size="3xl"
          scrollBehavior="inside"
        >
          <ModalContent>
            <ModalHeader>Edit Corporate Action Detail</ModalHeader>
            <ModalBody>
              {editingDetail && (
                <div className="space-y-4">
                  <StockAutocomplete
                    name="targetStock"
                    label="Target Stock"
                    placeholder="Search by stock name, symbol, ISIN, or BSE code"
                    value={editingDetail.TargetStockId || ""}
                    onSelectionChange={(stockId, stock) => {
                      if (stockId && stock) {
                        setEditingDetail({
                          ...editingDetail,
                          TargetStockId: stockId,
                        });
                        setInitialTargetStockName(stock.Name);
                      } else {
                        setEditingDetail({
                          ...editingDetail,
                          TargetStockId: null,
                        });
                        setInitialTargetStockName("");
                      }
                    }}
                    initialStockName={initialTargetStockName}
                  />

                  <Input
                    label="Ratio Quantity Held"
                    type="number"
                    step="0.0001"
                    value={editingDetail.RatioQuantityHeld.toString()}
                    onValueChange={(value) =>
                      setEditingDetail({
                        ...editingDetail,
                        RatioQuantityHeld: parseFloat(value) || 0,
                      })
                    }
                    isRequired
                  />

                  <Input
                    label="Ratio Quantity Entitled"
                    type="number"
                    step="0.0001"
                    value={editingDetail.RatioQuantityEntitled.toString()}
                    onValueChange={(value) =>
                      setEditingDetail({
                        ...editingDetail,
                        RatioQuantityEntitled: parseFloat(value) || 0,
                      })
                    }
                    isRequired
                  />

                  <Input
                    label="Ratio Book Value Held"
                    type="number"
                    step="0.0001"
                    value={editingDetail.RatioBookValueHeld?.toString() || ""}
                    onValueChange={(value) =>
                      setEditingDetail({
                        ...editingDetail,
                        RatioBookValueHeld: value ? parseFloat(value) : null,
                      })
                    }
                  />

                  <Input
                    label="Ratio Book Value Entitled"
                    type="number"
                    step="0.0001"
                    value={
                      editingDetail.RatioBookValueEntitled?.toString() || ""
                    }
                    onValueChange={(value) =>
                      setEditingDetail({
                        ...editingDetail,
                        RatioBookValueEntitled: value
                          ? parseFloat(value)
                          : null,
                      })
                    }
                  />

                  <Switch
                    isSelected={editingDetail.TargetSaleRow || false}
                    onValueChange={(value) =>
                      setEditingDetail({
                        ...editingDetail,
                        TargetSaleRow: value,
                      })
                    }
                  >
                    Target Sale Row
                  </Switch>

                  <Textarea
                    label="Remark"
                    value={editingDetail.Remark || ""}
                    onValueChange={(value) =>
                      setEditingDetail({ ...editingDetail, Remark: value })
                    }
                  />

                  <Switch
                    isSelected={editingDetail.IsActive}
                    onValueChange={(value) =>
                      setEditingDetail({ ...editingDetail, IsActive: value })
                    }
                  >
                    Active
                  </Switch>
                </div>
              )}
            </ModalBody>
            <ModalFooter>
              <Button
                variant="light"
                onPress={() => setIsEditDetailModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                color="primary"
                onPress={handleSaveDetail}
                isLoading={isSaving}
              >
                Save Changes
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>

        {/* Add Detail Modal */}
        <Modal
          isOpen={isAddDetailModalOpen}
          onClose={() => setIsAddDetailModalOpen(false)}
          size="3xl"
          scrollBehavior="inside"
        >
          <ModalContent>
            <ModalHeader>Add New Corporate Action Detail</ModalHeader>
            <ModalBody>
              <div className="space-y-4">
                <StockAutocomplete
                  name="targetStock"
                  label="Target Stock (Optional)"
                  placeholder="Search by stock name, symbol, ISIN, or BSE code"
                  value={newDetail.targetStockId || ""}
                  onSelectionChange={(stockId, stock) => {
                    if (stockId && stock) {
                      setNewDetail({
                        ...newDetail,
                        targetStockId: stockId,
                      });
                      setInitialTargetStockName(stock.Name);
                    } else {
                      setNewDetail({
                        ...newDetail,
                        targetStockId: null,
                      });
                      setInitialTargetStockName("");
                    }
                  }}
                  initialStockName={initialTargetStockName}
                />

                <Input
                  label="Ratio Quantity Held"
                  type="number"
                  step="0.0001"
                  value={newDetail.ratioQuantityHeld.toString()}
                  onValueChange={(value) =>
                    setNewDetail({
                      ...newDetail,
                      ratioQuantityHeld: parseFloat(value) || 0,
                    })
                  }
                  isRequired
                />

                <Input
                  label="Ratio Quantity Entitled"
                  type="number"
                  step="0.0001"
                  value={newDetail.ratioQuantityEntitled.toString()}
                  onValueChange={(value) =>
                    setNewDetail({
                      ...newDetail,
                      ratioQuantityEntitled: parseFloat(value) || 0,
                    })
                  }
                  isRequired
                />

                <Input
                  label="Ratio Book Value Held"
                  type="number"
                  step="0.0001"
                  value={newDetail.ratioBookValueHeld?.toString() || ""}
                  onValueChange={(value) =>
                    setNewDetail({
                      ...newDetail,
                      ratioBookValueHeld: value ? parseFloat(value) : null,
                    })
                  }
                />

                <Input
                  label="Ratio Book Value Entitled"
                  type="number"
                  step="0.0001"
                  value={newDetail.ratioBookValueEntitled?.toString() || ""}
                  onValueChange={(value) =>
                    setNewDetail({
                      ...newDetail,
                      ratioBookValueEntitled: value ? parseFloat(value) : null,
                    })
                  }
                />

                <Input
                  label="Reference Document URL"
                  type="url"
                  placeholder="https://example.com/document.pdf"
                  value={newDetail.referenceDocUrl || ""}
                  onValueChange={(value) =>
                    setNewDetail({
                      ...newDetail,
                      referenceDocUrl: value || null,
                    })
                  }
                />

                <Switch
                  isSelected={newDetail.targetSaleRow}
                  onValueChange={(value) =>
                    setNewDetail({
                      ...newDetail,
                      targetSaleRow: value,
                    })
                  }
                >
                  Target Sale Row
                </Switch>

                <Textarea
                  label="Remark"
                  value={newDetail.remark || ""}
                  onValueChange={(value) =>
                    setNewDetail({ ...newDetail, remark: value || null })
                  }
                />
              </div>
            </ModalBody>
            <ModalFooter>
              <Button
                variant="light"
                onPress={() => setIsAddDetailModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                color="primary"
                onPress={handleSaveNewDetail}
                isLoading={isSaving}
              >
                Add Detail
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>

        {/* Add Corporate Action Modal */}
        <Modal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          size="5xl"
          scrollBehavior="inside"
        >
          <ModalContent>
            <ModalHeader>Add New Corporate Action</ModalHeader>
            <ModalBody>
              <div className="space-y-6">
                {/* Record Information */}
                <div className="space-y-4">
                  <StockAutocomplete
                    name="sourceStock"
                    label="Source Stock"
                    placeholder="Search by stock name, symbol, ISIN, or BSE code"
                    value={newAction.sourceStockId}
                    onSelectionChange={(stockId, stock) => {
                      if (stockId && stock) {
                        setNewAction({
                          ...newAction,
                          sourceStockId: stockId,
                        });
                        setInitialStockName(stock.Name);
                      }
                    }}
                    initialStockName={initialStockName}
                    isRequired
                  />

                  <Select
                    label="Corporate Action Type"
                    placeholder="Select corporate action type"
                    selectedKeys={
                      newAction.corpActionTypeId
                        ? [newAction.corpActionTypeId.toString()]
                        : []
                    }
                    onSelectionChange={(keys) => {
                      const value = Array.from(keys)[0] as string;
                      setNewAction({
                        ...newAction,
                        corpActionTypeId: parseInt(value),
                      });
                    }}
                    isRequired
                  >
                    {corporateActionTypes.map((type) => (
                      <SelectItem key={type.Id.toString()}>
                        {type.Name}
                      </SelectItem>
                    ))}
                  </Select>

                  <div className="grid grid-cols-3 gap-4">
                    <Input
                      label="Ex Date"
                      type="date"
                      onValueChange={(value) => {
                        const date = new Date(value);
                        setNewAction({
                          ...newAction,
                          exDate: dateToEpoch(date),
                        });
                      }}
                      isRequired
                    />

                    <Input
                      label="Record Date"
                      type="date"
                      onValueChange={(value) => {
                        const date = new Date(value);
                        setNewAction({
                          ...newAction,
                          recordDate: dateToEpoch(date),
                        });
                      }}
                      isRequired
                    />

                    <Input
                      label="Allotment Date"
                      type="date"
                      onValueChange={(value) => {
                        const date = value ? new Date(value) : null;
                        setNewAction({
                          ...newAction,
                          allotmentDate: date ? dateToEpoch(date) : null,
                        });
                      }}
                    />
                  </div>

                  <Textarea
                    label="Remark"
                    placeholder="Enter any remarks"
                    onValueChange={(value) =>
                      setNewAction({ ...newAction, remark: value || null })
                    }
                  />
                </div>

                {/* Details Section */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Action Details</h3>
                    <Button
                      size="sm"
                      color="primary"
                      variant="bordered"
                      startContent={<FiPlus />}
                      onPress={handleAddDetailRow}
                    >
                      Add Detail Row
                    </Button>
                  </div>

                  {newAction.details.length === 0 ? (
                    <div className="rounded-lg border-2 border-dashed border-default-300 p-8 text-center text-default-500">
                      No detail rows added. Click "Add Detail Row" to add the
                      first row.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {newAction.details.map((detail, index) => (
                        <div
                          key={detail.tempId}
                          className="space-y-4 rounded-lg border border-default-200 p-4"
                        >
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium">
                              Detail Row {index + 1}
                            </h4>
                            <Button
                              size="sm"
                              color="danger"
                              variant="light"
                              isIconOnly
                              onPress={() =>
                                handleRemoveDetailRow(detail.tempId)
                              }
                            >
                              <FiTrash2 />
                            </Button>
                          </div>

                          <StockAutocomplete
                            name={`targetStock-${detail.tempId}`}
                            label="Target Stock (Optional)"
                            placeholder="Search by stock name, symbol, ISIN, or BSE code"
                            value={detail.targetStockId || ""}
                            onSelectionChange={(stockId, stock) => {
                              if (stock) {
                                handleUpdateDetailRow(
                                  detail.tempId,
                                  "targetStockId",
                                  stockId
                                );
                                setTargetStockNames({
                                  ...targetStockNames,
                                  [detail.tempId]: stock.Name,
                                });
                              } else {
                                handleUpdateDetailRow(
                                  detail.tempId,
                                  "targetStockId",
                                  null
                                );
                                const { [detail.tempId]: _, ...rest } =
                                  targetStockNames;
                                setTargetStockNames(rest);
                              }
                            }}
                            initialStockName={
                              targetStockNames[detail.tempId] || ""
                            }
                          />

                          <div className="grid grid-cols-2 gap-4">
                            <Input
                              label="Ratio Quantity Held"
                              type="number"
                              step="0.0001"
                              value={detail.ratioQuantityHeld.toString()}
                              onValueChange={(value) =>
                                handleUpdateDetailRow(
                                  detail.tempId,
                                  "ratioQuantityHeld",
                                  parseFloat(value) || 0
                                )
                              }
                              isRequired
                            />

                            <Input
                              label="Ratio Quantity Entitled"
                              type="number"
                              step="0.0001"
                              value={detail.ratioQuantityEntitled.toString()}
                              onValueChange={(value) =>
                                handleUpdateDetailRow(
                                  detail.tempId,
                                  "ratioQuantityEntitled",
                                  parseFloat(value) || 0
                                )
                              }
                              isRequired
                            />

                            <Input
                              label="Ratio Book Value Held"
                              type="number"
                              step="0.0001"
                              value={
                                detail.ratioBookValueHeld?.toString() || ""
                              }
                              onValueChange={(value) =>
                                handleUpdateDetailRow(
                                  detail.tempId,
                                  "ratioBookValueHeld",
                                  value ? parseFloat(value) : null
                                )
                              }
                            />

                            <Input
                              label="Ratio Book Value Entitled"
                              type="number"
                              step="0.0001"
                              value={
                                detail.ratioBookValueEntitled?.toString() || ""
                              }
                              onValueChange={(value) =>
                                handleUpdateDetailRow(
                                  detail.tempId,
                                  "ratioBookValueEntitled",
                                  value ? parseFloat(value) : null
                                )
                              }
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <Switch
                              isSelected={detail.targetSaleRow}
                              onValueChange={(value) =>
                                handleUpdateDetailRow(
                                  detail.tempId,
                                  "targetSaleRow",
                                  value
                                )
                              }
                            >
                              Target Sale Row
                            </Switch>
                          </div>

                          <Textarea
                            label="Detail Remark"
                            placeholder="Enter any remarks for this detail"
                            value={detail.remark || ""}
                            onValueChange={(value) =>
                              handleUpdateDetailRow(
                                detail.tempId,
                                "remark",
                                value || null
                              )
                            }
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </ModalBody>
            <ModalFooter>
              <Button variant="light" onPress={() => setIsAddModalOpen(false)}>
                Cancel
              </Button>
              <Button
                color="primary"
                onPress={handleSaveNewAction}
                isLoading={isSaving}
              >
                Save Corporate Action
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>

        {/* Delete Record Confirmation Modal */}
        <Modal
          isOpen={isDeleteRecordModalOpen}
          onClose={() => setIsDeleteRecordModalOpen(false)}
          size="md"
        >
          <ModalContent>
            <ModalHeader>Confirm Delete</ModalHeader>
            <ModalBody>
              {deletingRecord && (
                <div className="space-y-4">
                  <p className="text-default-700">
                    Are you sure you want to delete this corporate action
                    record?
                  </p>
                  <div className="rounded-lg bg-danger-50 p-4">
                    <p className="text-sm font-semibold text-danger">
                      {deletingRecord.Symbol} - {deletingRecord.StockName}
                    </p>
                    <p className="text-sm text-danger-600">
                      {deletingRecord.CorporateActionName}
                    </p>
                    <p className="text-xs text-danger-500">
                      Ex Date: {formatEpochDate(deletingRecord.ExDate)}
                    </p>
                  </div>
                  <p className="text-sm text-default-500">
                    This action cannot be undone.
                  </p>
                </div>
              )}
            </ModalBody>
            <ModalFooter>
              <Button
                variant="light"
                onPress={() => setIsDeleteRecordModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                color="danger"
                onPress={handleConfirmDeleteRecord}
                isLoading={isDeleting}
              >
                Delete
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>

        {/* Delete Detail Confirmation Modal */}
        <Modal
          isOpen={isDeleteDetailModalOpen}
          onClose={() => setIsDeleteDetailModalOpen(false)}
          size="md"
        >
          <ModalContent>
            <ModalHeader>Confirm Delete</ModalHeader>
            <ModalBody>
              {deletingDetail && (
                <div className="space-y-4">
                  <p className="text-default-700">
                    Are you sure you want to delete this corporate action
                    detail?
                  </p>
                  <div className="rounded-lg bg-danger-50 p-4">
                    <p className="text-sm font-semibold text-danger">
                      Target Stock: {deletingDetail.Symbol || "N/A"}
                    </p>
                    <p className="text-sm text-danger-600">
                      Ratio: {formatNumber(deletingDetail.RatioQuantityHeld)} :{" "}
                      {formatNumber(deletingDetail.RatioQuantityEntitled)}
                    </p>
                  </div>
                  <p className="text-sm text-default-500">
                    This action cannot be undone.
                  </p>
                </div>
              )}
            </ModalBody>
            <ModalFooter>
              <Button
                variant="light"
                onPress={() => setIsDeleteDetailModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                color="danger"
                onPress={handleConfirmDeleteDetail}
                isLoading={isDeleting}
              >
                Delete
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>

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
    </div>
  );
}
