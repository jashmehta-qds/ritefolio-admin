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
import { FiEye, FiEdit2 } from "react-icons/fi";
import { createClient } from "@/lib/supabase/client";
import axiosInstance from "@/lib/axios";
import { formatEpochDate, dateToEpoch } from "@/utils/date";
import { StockAutocomplete, Stock } from "@/components/StockAutocomplete";

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

export default function CorporateActionRecordsPage() {
  const [records, setRecords] = useState<CorporateActionRecord[]>([]);
  const [selectedRecord, setSelectedRecord] =
    useState<CorporateActionRecord | null>(null);
  const [details, setDetails] = useState<CorporateActionDetail[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  // Edit states
  const [isEditRecordModalOpen, setIsEditRecordModalOpen] = useState(false);
  const [isEditDetailModalOpen, setIsEditDetailModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] =
    useState<CorporateActionRecord | null>(null);
  const [editingDetail, setEditingDetail] =
    useState<CorporateActionDetail | null>(null);
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

      fetchRecords();
      fetchCorporateActionTypes();
    };

    checkAuth();
  }, [router, supabase.auth]);

  const fetchRecords = async () => {
    try {
      setIsLoading(true);
      const response = await axiosInstance.get("/corporate-action/records");
      const result = response.data;

      if (result.success) {
        setRecords(result.data);
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
        </div>

        {/* Records Table */}
        <Table
          aria-label="Corporate action records table"
          className="max-h-[70vh] overflow-auto"
          isHeaderSticky
        >
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
                    <Button
                      size="sm"
                      variant="light"
                      isIconOnly
                      onPress={() => handleEditRecord(record)}
                    >
                      <FiEdit2 />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

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
                    <h3 className="mb-4 text-md font-semibold">
                      Action Details
                    </h3>
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
                                <Button
                                  size="sm"
                                  variant="light"
                                  isIconOnly
                                  onPress={() => handleEditDetail(detail)}
                                >
                                  <FiEdit2 />
                                </Button>
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
