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
import { Pagination } from "@heroui/pagination";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "@heroui/modal";
import { Input } from "@heroui/input";
import { Select, SelectItem } from "@heroui/select";
import { Autocomplete, AutocompleteItem } from "@heroui/autocomplete";
import { Accordion, AccordionItem } from "@heroui/accordion";
import { Divider } from "@heroui/divider";
import { Tooltip } from "@heroui/tooltip";
import { Switch } from "@heroui/switch";
import {
  FiPlus,
  FiSearch,
  FiEye,
  FiCopy,
  FiCheck,
  FiEdit2,
  FiArrowRight,
  FiChevronRight,
  FiChevronLeft,
} from "react-icons/fi";
import { createClient } from "@/lib/supabase/client";
import axiosInstance from "@/lib/axios";
import StockTypeAutocomplete from "@/components/StockTypeAutocomplete";
import { CountryAutocomplete } from "@/components/CountryAutocomplete";

interface Stock {
  Id: string;
  CountryId: number | null;
  InvestmentTypeId: number | null;
  Isin: string | null;
  Name: string | null;
  FaceValue: number | null;
  Listed: boolean;
  Symbol: string | null;
  BseCode: string | null;
  BasicIndustry: string | null;
  SectoralIndex: string | null;
  Slb: boolean | null;
  IsActive: boolean;
  CreatedOn?: number;
}

interface Country {
  Id: number;
  Name: string;
  Code: string;
}

interface InvestmentType {
  Id: number;
  InvestmentId: number;
  InvestmentCategory: string;
  ShortCode: string;
  Description: string;
  IsActive: boolean;
}

const ADD_STEPS = ["Identifiers", "Details"];

function StepIndicator({ currentStep }: { currentStep: number }) {
  return (
    <div className="flex items-center w-full">
      {ADD_STEPS.map((label, index) => {
        const num = index + 1;
        const done = num < currentStep;
        const active = num === currentStep;
        return (
          <div key={num} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-all ${
                  done
                    ? "bg-primary text-primary-foreground"
                    : active
                      ? "bg-primary text-primary-foreground ring-2 ring-primary/30 ring-offset-1"
                      : "bg-default-100 text-default-400"
                }`}
              >
                {done ? <FiCheck className="w-3.5 h-3.5" /> : num}
              </div>
              <span
                className={`text-xs font-medium whitespace-nowrap ${
                  active
                    ? "text-primary"
                    : done
                      ? "text-default-600"
                      : "text-default-400"
                }`}
              >
                {label}
              </span>
            </div>
            {index < ADD_STEPS.length - 1 && (
              <div
                className={`flex-1 h-px mx-2 mb-5 transition-colors ${
                  num < currentStep ? "bg-primary" : "bg-default-200"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function StagingStocksPage() {
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [investmentTypes, setInvestmentTypes] = useState<InvestmentType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isMigrateModalOpen, setIsMigrateModalOpen] = useState(false);
  const [selectedStock, setSelectedStock] = useState<Stock | null>(null);
  const [editingStock, setEditingStock] = useState<Stock | null>(null);
  const [migratingStock, setMigratingStock] = useState<Stock | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCountryId, setFilterCountryId] = useState<string>("");
  const [filterInvestmentTypes, setFilterInvestmentTypes] = useState<string[]>(
    [],
  );
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);
  const router = useRouter();
  const supabase = createClient();

  // Add stock stepper state
  const [addStep, setAddStep] = useState(1);
  const [stepErrors, setStepErrors] = useState<Record<string, string>>({});

  // Edit stock stepper state
  const [editStep, setEditStep] = useState(1);
  const [editStepErrors, setEditStepErrors] = useState<Record<string, string>>(
    {},
  );

  // Form state
  const [formData, setFormData] = useState({
    symbol: "",
    isin: "",
    bseCode: "",
    stockName: "",
    countryId: "",
    investmentType: "",
    isListed: false,
  });

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

      fetchCountries();
      fetchInvestmentTypes();
    };

    checkAuth();
  }, [router, supabase.auth]);

  // Debounced search effect
  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentPage(1);
      fetchStocks(1, searchTerm, filterCountryId, filterInvestmentTypes);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch stocks when page changes
  useEffect(() => {
    fetchStocks(
      currentPage,
      searchTerm,
      filterCountryId,
      filterInvestmentTypes,
    );
  }, [currentPage]);

  // Fetch stocks when filters change
  useEffect(() => {
    setCurrentPage(1);
    fetchStocks(1, searchTerm, filterCountryId, filterInvestmentTypes);
  }, [filterCountryId, filterInvestmentTypes]);

  const fetchStocks = async (
    page: number = 1,
    search: string = "",
    countryId: string = "",
    investmentTypes: string[] = [],
  ) => {
    try {
      setIsLoading(true);

      const params = new URLSearchParams();
      params.append("page", page.toString());
      params.append("limit", "50");

      if (search.trim()) {
        params.append("symbol", search);
        params.append("isin", search);
        params.append("stockName", search);
        params.append("bseCode", search);
      }

      if (countryId) params.append("countryId", countryId);
      investmentTypes.forEach((id) => params.append("investmentType", id));

      const response = await axiosInstance.get(
        `/stocks/staging?${params.toString()}`,
      );
      const result = response.data;

      if (result.success) {
        setStocks(result.data);
        setHasMore(result.pagination?.hasMore || false);
      } else {
        console.error("Failed to fetch staging stocks:", result.error);
      }
    } catch (error) {
      console.error("Error fetching staging stocks:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCountries = async () => {
    try {
      const response = await axiosInstance.get("/country");
      const result = response.data;
      if (result.success) {
        setCountries(result.data);
      }
    } catch (error) {
      console.error("Error fetching countries:", error);
    }
  };

  const fetchInvestmentTypes = async () => {
    try {
      const response = await axiosInstance.get("/investment/type");
      const result = response.data;
      if (result.success) {
        setInvestmentTypes(result.data);
      }
    } catch (error) {
      console.error("Error fetching investment types:", error);
    }
  };

  const validateStep = (step: number): boolean => {
    const errors: Record<string, string> = {};
    if (step === 1) {
      if (
        !formData.symbol.trim() &&
        !formData.isin.trim() &&
        !formData.bseCode.trim() &&
        !formData.stockName.trim()
      ) {
        errors.symbol =
          "At least one of symbol, ISIN, BSE code, or stock name is required";
      }
    }
    setStepErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(addStep)) setAddStep((s) => s + 1);
  };

  const handleBack = () => {
    setStepErrors({});
    setAddStep((s) => s - 1);
  };

  const validateEditStep = (step: number): boolean => {
    const errors: Record<string, string> = {};
    if (step === 1 && editingStock) {
      if (
        !editingStock.Symbol?.trim() &&
        !editingStock.Isin?.trim() &&
        !editingStock.BseCode?.trim() &&
        !editingStock.Name?.trim()
      ) {
        errors.symbol =
          "At least one of symbol, ISIN, BSE code, or stock name is required";
      }
    }
    setEditStepErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleEditNext = () => {
    if (validateEditStep(editStep)) setEditStep((s) => s + 1);
  };

  const handleEditBack = () => {
    setEditStepErrors({});
    setEditStep((s) => s - 1);
  };

  const handleAddStock = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const response = await axiosInstance.post("/stocks/staging", {
        ...formData,
        createdBy: user?.id || null,
      });
      const result = response.data;

      if (result.success) {
        showToast("Stock added successfully", "success");
        handleCloseModal();
        fetchStocks(1, searchTerm, filterCountryId, filterInvestmentTypes);
      } else {
        showToast(
          result.message || result.error || "Failed to add stock",
          "error",
        );
      }
    } catch (error) {
      console.error("Error adding staging stock:", error);
      showToast("Failed to add stock. Please try again.", "error");
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setAddStep(1);
    setStepErrors({});
    setFormData({
      symbol: "",
      isin: "",
      bseCode: "",
      stockName: "",
      countryId: "",
      investmentType: "",
      isListed: false,
    });
  };

  const handleViewDetails = (stock: Stock) => {
    setSelectedStock(stock);
    setIsDetailsModalOpen(true);
  };

  const handleCopyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  };

  const handleEditStock = (stock: Stock) => {
    setEditingStock({ ...stock });
    setEditStep(1);
    setEditStepErrors({});
    setIsEditModalOpen(true);
  };

  const handleSaveStock = async () => {
    if (!editingStock) return;

    try {
      setIsSaving(true);

      const response = await axiosInstance.put(
        `/stocks/staging/${editingStock.Id}`,
        {
          countryId: editingStock.CountryId,
          investmentType: editingStock.InvestmentTypeId?.toString() || null,
          isin: editingStock.Isin,
          stockName: editingStock.Name,
          faceValue: editingStock.FaceValue,
          symbol: editingStock.Symbol,
          bseCode: editingStock.BseCode,
          basicIndustry: editingStock.BasicIndustry,
          sectoralIndex: editingStock.SectoralIndex,
          slb: editingStock.Slb,
          isListed: editingStock.Listed,
          isActive: editingStock.IsActive,
        },
      );

      if (response.data.success) {
        showToast("Stock updated successfully", "success");
        setIsEditModalOpen(false);
        setEditingStock(null);
        setEditStep(1);
        setEditStepErrors({});
        await fetchStocks(
          currentPage,
          searchTerm,
          filterCountryId,
          filterInvestmentTypes,
        );
      } else {
        showToast(
          response.data.message ||
            response.data.error ||
            "Failed to update stock",
          "error",
        );
      }
    } catch (error) {
      console.error("Error updating stock:", error);
      showToast("Failed to update stock. Please try again.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleMigrateStock = (stock: Stock) => {
    setMigratingStock(stock);
    setIsMigrateModalOpen(true);
  };

  const handleConfirmMigrate = async () => {
    if (!migratingStock) return;

    try {
      setIsMigrating(true);

      const response = await axiosInstance.post(
        `/stocks/staging/${migratingStock.Id}/migrate`,
      );

      if (response.data.success) {
        showToast("Stock migrated to listed stocks successfully", "success");
        setIsMigrateModalOpen(false);
        setMigratingStock(null);
        await fetchStocks(
          currentPage,
          searchTerm,
          filterCountryId,
          filterInvestmentTypes,
        );
      } else {
        showToast(
          response.data.message ||
            response.data.error ||
            "Failed to migrate stock",
          "error",
        );
      }
    } catch (error) {
      console.error("Error migrating stock:", error);
      showToast("Failed to migrate stock. Please try again.", "error");
    } finally {
      setIsMigrating(false);
    }
  };

  if (isLoading && stocks.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent" />
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
              Staging Stocks
            </h1>
            <p className="mt-2 text-default-500">
              Temporary storage for unknown or incomplete stocks
            </p>
          </div>
          <Button
            color="primary"
            startContent={<FiPlus />}
            onPress={() => setIsModalOpen(true)}
          >
            Add Stock
          </Button>
        </div>

        {/* Search and Filters */}
        <div className="mb-4 flex flex-wrap items-end gap-3">
          <Input
            placeholder="Search by name, symbol, ISIN, or BSE code..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            startContent={<FiSearch />}
            className="max-w-md"
          />
          <Autocomplete
            placeholder="Filter by country"
            selectedKey={filterCountryId || null}
            onSelectionChange={(key) =>
              setFilterCountryId((key as string) || "")
            }
            className="max-w-[200px]"
            size="md"
          >
            {countries.map((country) => (
              <AutocompleteItem key={country.Id.toString()}>
                {country.Name}
              </AutocompleteItem>
            ))}
          </Autocomplete>
          <Select
            placeholder="Filter by investment type"
            selectionMode="multiple"
            selectedKeys={new Set(filterInvestmentTypes)}
            onSelectionChange={(keys) => {
              if (keys === "all") return;
              setFilterInvestmentTypes(Array.from(keys as Set<string>));
            }}
            className="max-w-[220px]"
            size="md"
          >
            {investmentTypes.map((type) => (
              <SelectItem
                key={type.Id.toString()}
                textValue={`${type.ShortCode} - ${type.InvestmentCategory}`}
              >
                {type.ShortCode} - {type.InvestmentCategory}
              </SelectItem>
            ))}
          </Select>
          {(filterCountryId || filterInvestmentTypes.length > 0) && (
            <Button
              variant="flat"
              size="md"
              onPress={() => {
                setFilterCountryId("");
                setFilterInvestmentTypes([]);
              }}
            >
              Clear Filters
            </Button>
          )}
        </div>

        {/* Stocks Table */}
        <Table
          aria-label="Staging stocks table"
          isHeaderSticky
          className="glass-card rounded-xl shadow-lg overflow-hidden"
          classNames={{
            wrapper: "max-h-[calc(100vh-250px)] p-0",
            base: "p-0",
            th: "text-xs sm:text-sm",
            td: "text-xs sm:text-sm py-2",
          }}
        >
          <TableHeader>
            <TableColumn>SYMBOL</TableColumn>
            <TableColumn>NAME</TableColumn>
            <TableColumn>ISIN</TableColumn>
            <TableColumn>BSE CODE</TableColumn>
            <TableColumn>FACE VALUE</TableColumn>
            <TableColumn>ACTION</TableColumn>
          </TableHeader>
          <TableBody
            emptyContent={isLoading ? "Loading..." : "No stocks found"}
            isLoading={isLoading}
          >
            {stocks.map((stock) => (
              <TableRow key={stock.Id}>
                <TableCell className="font-semibold">
                  {stock.Symbol || "-"}
                </TableCell>
                <TableCell>{stock.Name || "-"}</TableCell>
                <TableCell>{stock.Isin || "-"}</TableCell>
                <TableCell>{stock.BseCode || "-"}</TableCell>
                <TableCell>{stock.FaceValue ?? "-"}</TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Tooltip content="View details">
                      <Button
                        isIconOnly
                        size="sm"
                        variant="light"
                        onPress={() => handleViewDetails(stock)}
                        aria-label="View details"
                      >
                        <FiEye className="text-lg" />
                      </Button>
                    </Tooltip>
                    <Tooltip content="Edit stock">
                      <Button
                        isIconOnly
                        size="sm"
                        variant="light"
                        onPress={() => handleEditStock(stock)}
                        aria-label="Edit stock"
                      >
                        <FiEdit2 className="text-lg" />
                      </Button>
                    </Tooltip>
                    <Tooltip content="Migrate to listed stocks">
                      <Button
                        isIconOnly
                        size="sm"
                        variant="light"
                        color="success"
                        onPress={() => handleMigrateStock(stock)}
                        aria-label="Migrate to listed stocks"
                      >
                        <FiArrowRight className="text-lg" />
                      </Button>
                    </Tooltip>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {/* Pagination */}
        {stocks.length > 0 && (
          <div className="mt-4 flex w-full justify-center">
            <Pagination
              isCompact
              showControls
              showShadow
              color="primary"
              page={currentPage}
              total={hasMore ? currentPage + 1 : currentPage}
              onChange={(page) => setCurrentPage(page)}
            />
          </div>
        )}

        {/* Stock Details Modal */}
        <Modal
          isOpen={isDetailsModalOpen}
          onClose={() => setIsDetailsModalOpen(false)}
          size="5xl"
          scrollBehavior="inside"
          classNames={{
            base: "max-h-[95vh]",
            wrapper: "items-center",
            body: "py-6",
          }}
        >
          <ModalContent>
            {(onClose) => (
              <>
                <ModalHeader className="flex flex-col gap-1 pb-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h2 className="text-xl sm:text-2xl font-bold truncate">
                        {selectedStock?.Name || "Unknown Stock"}
                      </h2>
                      <p className="text-sm text-default-500 font-normal">
                        {selectedStock?.Symbol || "No Symbol"}
                      </p>
                    </div>
                    <Chip
                      color={selectedStock?.IsActive ? "warning" : "default"}
                      variant="flat"
                      className="self-start sm:self-center"
                    >
                      {selectedStock?.IsActive ? "Staging" : "Inactive"}
                    </Chip>
                  </div>
                </ModalHeader>
                <Divider />
                <ModalBody className="py-4 px-3 sm:px-6">
                  {selectedStock && (
                    <Accordion
                      variant="bordered"
                      defaultExpandedKeys={["basic"]}
                      className="gap-2"
                    >
                      <AccordionItem
                        key="basic"
                        aria-label="Basic Information"
                        title={
                          <span className="font-semibold text-base sm:text-lg">
                            Basic Information
                          </span>
                        }
                        classNames={{ content: "pb-4 pt-2" }}
                      >
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 px-1 sm:px-3">
                          {selectedStock.Symbol && (
                            <div className="space-y-1">
                              <p className="text-xs text-default-500">Symbol</p>
                              <div className="flex items-center gap-2">
                                <p className="font-semibold">
                                  {selectedStock.Symbol}
                                </p>
                                <Tooltip
                                  content={
                                    copiedField === "symbol"
                                      ? "Copied!"
                                      : "Copy"
                                  }
                                >
                                  <Button
                                    isIconOnly
                                    size="sm"
                                    variant="light"
                                    onPress={() =>
                                      handleCopyToClipboard(
                                        selectedStock.Symbol!,
                                        "symbol",
                                      )
                                    }
                                  >
                                    {copiedField === "symbol" ? (
                                      <FiCheck className="text-success" />
                                    ) : (
                                      <FiCopy className="text-default-400" />
                                    )}
                                  </Button>
                                </Tooltip>
                              </div>
                            </div>
                          )}
                          {selectedStock.Isin && (
                            <div className="space-y-1">
                              <p className="text-xs text-default-500">ISIN</p>
                              <div className="flex items-center gap-2">
                                <p className="font-semibold">
                                  {selectedStock.Isin}
                                </p>
                                <Tooltip
                                  content={
                                    copiedField === "isin" ? "Copied!" : "Copy"
                                  }
                                >
                                  <Button
                                    isIconOnly
                                    size="sm"
                                    variant="light"
                                    onPress={() =>
                                      handleCopyToClipboard(
                                        selectedStock.Isin!,
                                        "isin",
                                      )
                                    }
                                  >
                                    {copiedField === "isin" ? (
                                      <FiCheck className="text-success" />
                                    ) : (
                                      <FiCopy className="text-default-400" />
                                    )}
                                  </Button>
                                </Tooltip>
                              </div>
                            </div>
                          )}
                          {selectedStock.BseCode && (
                            <div className="space-y-1">
                              <p className="text-xs text-default-500">
                                BSE Code
                              </p>
                              <div className="flex items-center gap-2">
                                <p className="font-semibold">
                                  {selectedStock.BseCode}
                                </p>
                                <Tooltip
                                  content={
                                    copiedField === "bseCode"
                                      ? "Copied!"
                                      : "Copy"
                                  }
                                >
                                  <Button
                                    isIconOnly
                                    size="sm"
                                    variant="light"
                                    onPress={() =>
                                      handleCopyToClipboard(
                                        selectedStock.BseCode!,
                                        "bseCode",
                                      )
                                    }
                                  >
                                    {copiedField === "bseCode" ? (
                                      <FiCheck className="text-success" />
                                    ) : (
                                      <FiCopy className="text-default-400" />
                                    )}
                                  </Button>
                                </Tooltip>
                              </div>
                            </div>
                          )}
                          {selectedStock.FaceValue != null && (
                            <div className="space-y-1">
                              <p className="text-xs text-default-500">
                                Face Value
                              </p>
                              <p className="font-semibold">
                                {selectedStock.FaceValue}
                              </p>
                            </div>
                          )}
                        </div>
                      </AccordionItem>

                      <AccordionItem
                        key="system"
                        aria-label="System Information"
                        title={
                          <span className="font-semibold text-base sm:text-lg">
                            System Information
                          </span>
                        }
                        classNames={{ content: "pb-4 pt-2" }}
                      >
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 px-1 sm:px-3">
                          <div className="space-y-1">
                            <p className="text-xs text-default-500">Stock ID</p>
                            <div className="flex items-center gap-2">
                              <p className="font-mono text-sm">
                                {selectedStock.Id}
                              </p>
                              <Tooltip
                                content={
                                  copiedField === "id" ? "Copied!" : "Copy"
                                }
                              >
                                <Button
                                  isIconOnly
                                  size="sm"
                                  variant="light"
                                  onPress={() =>
                                    handleCopyToClipboard(
                                      selectedStock.Id,
                                      "id",
                                    )
                                  }
                                >
                                  {copiedField === "id" ? (
                                    <FiCheck className="text-success" />
                                  ) : (
                                    <FiCopy className="text-default-400" />
                                  )}
                                </Button>
                              </Tooltip>
                            </div>
                          </div>
                          {selectedStock.CountryId && (
                            <div className="space-y-1">
                              <p className="text-xs text-default-500">
                                Country ID
                              </p>
                              <p className="font-semibold">
                                {selectedStock.CountryId}
                              </p>
                            </div>
                          )}
                          {selectedStock.InvestmentTypeId && (
                            <div className="space-y-1">
                              <p className="text-xs text-default-500">
                                Investment Type ID
                              </p>
                              <p className="font-semibold">
                                {selectedStock.InvestmentTypeId}
                              </p>
                            </div>
                          )}
                          <div className="space-y-1">
                            <p className="text-xs text-default-500">
                              Listed Status
                            </p>
                            <Chip
                              color={
                                selectedStock.Listed ? "success" : "default"
                              }
                              size="sm"
                              variant="flat"
                            >
                              {selectedStock.Listed ? "Listed" : "Unlisted"}
                            </Chip>
                          </div>
                        </div>
                      </AccordionItem>
                    </Accordion>
                  )}
                </ModalBody>
                <Divider />
                <ModalFooter className="px-4 py-3 sm:px-6 sm:py-4">
                  <Button
                    color="primary"
                    variant="flat"
                    onPress={onClose}
                    className="w-full sm:w-auto"
                  >
                    Close
                  </Button>
                </ModalFooter>
              </>
            )}
          </ModalContent>
        </Modal>

        {/* Add Stock Modal — Stepper */}
        <Modal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          size="2xl"
          scrollBehavior="inside"
        >
          <ModalContent>
            <ModalHeader className="flex flex-col gap-1 pb-2">
              <div className="flex items-center justify-between">
                <span>Add Stock to Staging</span>
                <span className="text-sm font-normal text-default-400">
                  Step {addStep} of {ADD_STEPS.length}
                </span>
              </div>
            </ModalHeader>
            <ModalBody className="pt-2">
              <StepIndicator currentStep={addStep} />
              <div className="mt-4">
                {/* Step 1: Identifiers */}
                {addStep === 1 && (
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <Input
                      label="Symbol"
                      placeholder="e.g. RELIANCE"
                      value={formData.symbol}
                      onChange={(e) =>
                        setFormData({ ...formData, symbol: e.target.value })
                      }
                      isInvalid={!!stepErrors.symbol}
                      errorMessage={stepErrors.symbol}
                    />
                    <Input
                      label="ISIN"
                      placeholder="e.g. INE002A01018"
                      value={formData.isin}
                      onChange={(e) =>
                        setFormData({ ...formData, isin: e.target.value })
                      }
                    />
                    <Input
                      label="BSE Code"
                      placeholder="e.g. 500325"
                      value={formData.bseCode}
                      onChange={(e) =>
                        setFormData({ ...formData, bseCode: e.target.value })
                      }
                    />
                    <Input
                      label="Stock Name"
                      placeholder="Enter stock name (optional)"
                      value={formData.stockName}
                      onChange={(e) =>
                        setFormData({ ...formData, stockName: e.target.value })
                      }
                    />
                  </div>
                )}

                {/* Step 2: Details */}
                {addStep === 2 && (
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <CountryAutocomplete
                      name="countryId"
                      label="Country"
                      placeholder="Search country (optional)"
                      value={formData.countryId}
                      onSelectionChange={(val) =>
                        setFormData({
                          ...formData,
                          countryId: val?.toString() || "",
                        })
                      }
                      variant="flat"
                    />
                    <StockTypeAutocomplete
                      name="investmentType"
                      label="Investment Type"
                      placeholder="Search investment type (optional)"
                      value={formData.investmentType}
                      onSelectionChange={(val) =>
                        setFormData({
                          ...formData,
                          investmentType: val?.toString() || "",
                        })
                      }
                      size="md"
                    />
                    <div className="md:col-span-2 pt-1">
                      <Switch
                        isSelected={formData.isListed}
                        onValueChange={(val) =>
                          setFormData({ ...formData, isListed: val })
                        }
                      >
                        <span className="text-sm">Listed</span>
                      </Switch>
                    </div>
                  </div>
                )}
              </div>
            </ModalBody>
            <ModalFooter>
              <Button variant="flat" onPress={handleCloseModal}>
                Cancel
              </Button>
              <div className="flex gap-2 ml-auto">
                {addStep > 1 && (
                  <Button
                    variant="flat"
                    startContent={<FiChevronLeft className="text-sm" />}
                    onPress={handleBack}
                  >
                    Back
                  </Button>
                )}
                {addStep < ADD_STEPS.length ? (
                  <Button
                    color="primary"
                    endContent={<FiChevronRight className="text-sm" />}
                    onPress={handleNext}
                  >
                    Next
                  </Button>
                ) : (
                  <Button color="primary" onPress={handleAddStock}>
                    Add to Staging
                  </Button>
                )}
              </div>
            </ModalFooter>
          </ModalContent>
        </Modal>

        {/* Edit Stock Modal — Stepper */}
        <Modal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setEditStep(1);
            setEditStepErrors({});
          }}
          size="3xl"
          scrollBehavior="inside"
        >
          <ModalContent>
            <ModalHeader className="flex flex-col gap-1 pb-2">
              <div className="flex items-center justify-between">
                <span>Edit Staging Stock</span>
                <span className="text-sm font-normal text-default-400">
                  Step {editStep} of {ADD_STEPS.length}
                </span>
              </div>
            </ModalHeader>
            <ModalBody className="pt-2">
              {editingStock && (
                <>
                  <StepIndicator currentStep={editStep} />
                  <div className="mt-4">
                    {/* Step 1: Identifiers */}
                    {editStep === 1 && (
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <Input
                          label="Symbol"
                          placeholder="e.g. RELIANCE"
                          value={editingStock.Symbol || ""}
                          onChange={(e) =>
                            setEditingStock({
                              ...editingStock,
                              Symbol: e.target.value || null,
                            })
                          }
                          isInvalid={!!editStepErrors.symbol}
                          errorMessage={editStepErrors.symbol}
                        />
                        <Input
                          label="ISIN"
                          placeholder="e.g. INE002A01018"
                          value={editingStock.Isin || ""}
                          onChange={(e) =>
                            setEditingStock({
                              ...editingStock,
                              Isin: e.target.value || null,
                            })
                          }
                        />
                        <Input
                          label="BSE Code"
                          placeholder="e.g. 500325"
                          value={editingStock.BseCode || ""}
                          onChange={(e) =>
                            setEditingStock({
                              ...editingStock,
                              BseCode: e.target.value || null,
                            })
                          }
                        />
                        <Input
                          label="Stock Name"
                          placeholder="Enter stock name"
                          value={editingStock.Name || ""}
                          onChange={(e) =>
                            setEditingStock({
                              ...editingStock,
                              Name: e.target.value || null,
                            })
                          }
                        />
                        <Input
                          label="Face Value"
                          type="number"
                          placeholder="e.g. 10"
                          min="0"
                          step="0.01"
                          value={editingStock.FaceValue?.toString() || ""}
                          onChange={(e) =>
                            setEditingStock({
                              ...editingStock,
                              FaceValue: parseFloat(e.target.value) || null,
                            })
                          }
                        />
                      </div>
                    )}

                    {/* Step 2: Details */}
                    {editStep === 2 && (
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <CountryAutocomplete
                          name="countryId"
                          label="Country"
                          placeholder="Search country"
                          value={editingStock.CountryId || undefined}
                          onSelectionChange={(val) =>
                            setEditingStock({
                              ...editingStock,
                              CountryId: val || null,
                            })
                          }
                          variant="flat"
                        />
                        <StockTypeAutocomplete
                          name="investmentType"
                          label="Investment Type"
                          placeholder="Search investment type"
                          value={editingStock.InvestmentTypeId || undefined}
                          onSelectionChange={(val) =>
                            setEditingStock({
                              ...editingStock,
                              InvestmentTypeId: val || null,
                            })
                          }
                          size="md"
                        />
                        <Input
                          label="Basic Industry"
                          placeholder="e.g. Refineries"
                          value={editingStock.BasicIndustry || ""}
                          onChange={(e) =>
                            setEditingStock({
                              ...editingStock,
                              BasicIndustry: e.target.value || null,
                            })
                          }
                        />
                        <Input
                          label="Sectoral Index"
                          placeholder="e.g. NIFTY 50"
                          value={editingStock.SectoralIndex || ""}
                          onChange={(e) =>
                            setEditingStock({
                              ...editingStock,
                              SectoralIndex: e.target.value || null,
                            })
                          }
                        />
                        <div className="md:col-span-2 flex items-center gap-8 pt-2">
                          <Switch
                            isSelected={editingStock.Slb || false}
                            onValueChange={(val) =>
                              setEditingStock({ ...editingStock, Slb: val })
                            }
                          >
                            <span className="text-sm">SLB Eligible</span>
                          </Switch>
                          <Switch
                            isSelected={editingStock.Listed}
                            onValueChange={(val) =>
                              setEditingStock({ ...editingStock, Listed: val })
                            }
                          >
                            <span className="text-sm">Listed</span>
                          </Switch>
                          <Switch
                            isSelected={editingStock.IsActive}
                            onValueChange={(val) =>
                              setEditingStock({
                                ...editingStock,
                                IsActive: val,
                              })
                            }
                          >
                            <span className="text-sm">Active</span>
                          </Switch>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </ModalBody>
            <ModalFooter>
              <Button
                variant="flat"
                onPress={() => {
                  setIsEditModalOpen(false);
                  setEditStep(1);
                  setEditStepErrors({});
                }}
              >
                Cancel
              </Button>
              <div className="flex gap-2 ml-auto">
                {editStep > 1 && (
                  <Button
                    variant="flat"
                    startContent={<FiChevronLeft className="text-sm" />}
                    onPress={handleEditBack}
                  >
                    Back
                  </Button>
                )}
                {editStep < ADD_STEPS.length ? (
                  <Button
                    color="primary"
                    endContent={<FiChevronRight className="text-sm" />}
                    onPress={handleEditNext}
                  >
                    Next
                  </Button>
                ) : (
                  <Button
                    color="primary"
                    onPress={handleSaveStock}
                    isLoading={isSaving}
                  >
                    Save Changes
                  </Button>
                )}
              </div>
            </ModalFooter>
          </ModalContent>
        </Modal>

        {/* Migrate Confirmation Modal */}
        <Modal
          isOpen={isMigrateModalOpen}
          onClose={() => setIsMigrateModalOpen(false)}
          size="md"
        >
          <ModalContent>
            <ModalHeader>Migrate to Listed Stocks</ModalHeader>
            <ModalBody>
              {migratingStock && (
                <div className="space-y-4">
                  <p className="text-default-700">
                    Are you sure you want to migrate this stock to the listed
                    stocks directory?
                  </p>
                  <div className="rounded-lg bg-default-100 p-4">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-default-500">
                          Symbol:
                        </span>
                        <span className="font-semibold">
                          {migratingStock.Symbol || "N/A"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-default-500">Name:</span>
                        <span className="font-semibold">
                          {migratingStock.Name || "N/A"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-default-500">ISIN:</span>
                        <span className="font-semibold">
                          {migratingStock.Isin || "N/A"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-default-500">
                          BSE Code:
                        </span>
                        <span className="font-semibold">
                          {migratingStock.BseCode || "N/A"}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-lg bg-warning-50 p-4">
                    <p className="text-sm text-warning-700">
                      <strong>Warning:</strong> This action will remove the
                      stock from staging and add it to the listed stocks
                      directory. This action cannot be undone.
                    </p>
                  </div>
                </div>
              )}
            </ModalBody>
            <ModalFooter>
              <Button
                variant="light"
                onPress={() => setIsMigrateModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                color="success"
                onPress={handleConfirmMigrate}
                isLoading={isMigrating}
              >
                Migrate to Listed Stocks
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
