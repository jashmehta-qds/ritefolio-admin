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
import { Switch } from "@heroui/switch";
import { Accordion, AccordionItem } from "@heroui/accordion";
import { Divider } from "@heroui/divider";
import { Tooltip } from "@heroui/tooltip";
import {
  FiPlus,
  FiSearch,
  FiEye,
  FiCopy,
  FiCheck,
  FiEdit2,
  FiChevronRight,
  FiChevronLeft,
} from "react-icons/fi";
import { createClient } from "@/lib/supabase/client";
import axiosInstance from "@/lib/axios";
import StockTypeAutocomplete from "@/components/StockTypeAutocomplete";
import { CountryAutocomplete } from "@/components/CountryAutocomplete";
import StockExchangeAutocomplete from "@/components/StockExchangeAutocomplete";
import StockAutocomplete from "@/components/StockAutocomplete";

interface Stock {
  Id: string;
  CountryId: number;
  InvestmentTypeId: number;
  Isin: string | null;
  Name: string;
  FaceValue: number;
  Listed: boolean;
  Symbol: string | null;
  BseCode: string | null;
  MacroSector: string | null;
  Sector: string | null;
  Industry: string | null;
  BasicIndustry: string | null;
  BroadIndustry: string | null;
  SectoralIndex: string | null;
  Slb: boolean | null;
  ListingDate: number | null;
  IpoDate: number | null;
  IssueDate: number | null;
  RecordDate: number | null;
  MaturityDate: number | null;
  Series: string | null;
  Issuer: string | null;
  CouponRate: number | null;
  CouponFrequency: string | null;
  SchemeName: string | null;
  ParentStockId: string | null;
  Status: string | null;
  Description: string | null;
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

const ADD_STEPS = ["Core Info", "Classification", "Dates & Instrument", "Settings"];

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

export default function UnlistedStocksPage() {
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [investmentTypes, setInvestmentTypes] = useState<InvestmentType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedStock, setSelectedStock] = useState<Stock | null>(null);
  const [editingStock, setEditingStock] = useState<Stock | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCountryId, setFilterCountryId] = useState<string>("");
  const [filterInvestmentTypes, setFilterInvestmentTypes] = useState<string[]>([]);
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
  const [editStepErrors, setEditStepErrors] = useState<Record<string, string>>({});

  // Form state
  const [formData, setFormData] = useState({
    // Core Info
    countryId: "",
    investmentType: "",
    stockExchangeIds: [] as number[],
    symbol: "",
    isin: "",
    stockName: "",
    faceValue: "",
    bseCode: "",
    // Classification
    macroSector: "",
    sector: "",
    industry: "",
    basicIndustry: "",
    broadIndustry: "",
    sectoralIndex: "",
    // Dates
    listingDate: "",
    ipoDate: "",
    issueDate: "",
    recordDate: "",
    maturityDate: "",
    // Instrument Details
    couponRate: "",
    couponFrequency: "",
    series: "",
    issuer: "",
    // Settings
    schemeName: "",
    parentStockId: "",
    status: "",
    description: "",
    slb: false,
    isActive: true,
  });

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

  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentPage(1);
      fetchStocks(1, searchTerm, filterCountryId, filterInvestmentTypes);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    fetchStocks(currentPage, searchTerm, filterCountryId, filterInvestmentTypes);
  }, [currentPage]);

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

      const response = await axiosInstance.get(`/stocks/unlisted?${params.toString()}`);
      const result = response.data;

      if (result.success) {
        setStocks(result.data);
        setHasMore(result.pagination?.hasMore || false);
      } else {
        console.error("Failed to fetch unlisted stocks:", result.error);
      }
    } catch (error) {
      console.error("Error fetching unlisted stocks:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCountries = async () => {
    try {
      const response = await axiosInstance.get("/country");
      if (response.data.success) setCountries(response.data.data);
    } catch (error) {
      console.error("Error fetching countries:", error);
    }
  };

  const fetchInvestmentTypes = async () => {
    try {
      const response = await axiosInstance.get("/investment/type");
      if (response.data.success) setInvestmentTypes(response.data.data);
    } catch (error) {
      console.error("Error fetching investment types:", error);
    }
  };

  const toEpoch = (d: string) =>
    d ? Math.floor(new Date(d).getTime() / 1000) : null;

  const epochToDateInput = (epoch: number | null): string =>
    epoch ? new Date(epoch * 1000).toISOString().split("T")[0] : "";

  const validateStep = (step: number): boolean => {
    const errors: Record<string, string> = {};
    if (step === 1) {
      if (!formData.countryId) errors.countryId = "Required";
      if (!formData.investmentType) errors.investmentType = "Required";
      if (!formData.symbol.trim()) errors.symbol = "Required";
      if (!formData.isin.trim()) errors.isin = "Required";
      if (!formData.stockName.trim()) errors.stockName = "Required";
      if (!formData.faceValue) errors.faceValue = "Required";
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
      if (!editingStock.CountryId) errors.countryId = "Required";
      if (!editingStock.InvestmentTypeId) errors.investmentType = "Required";
      if (!editingStock.Symbol?.trim()) errors.symbol = "Required";
      if (!editingStock.Isin?.trim()) errors.isin = "Required";
      if (!editingStock.Name?.trim()) errors.stockName = "Required";
      if (!editingStock.FaceValue) errors.faceValue = "Required";
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
      const payload = {
        ...formData,
        faceValue: parseFloat(formData.faceValue) || 0,
        couponRate: formData.couponRate ? parseFloat(formData.couponRate) : null,
        listingDate: toEpoch(formData.listingDate),
        ipoDate: toEpoch(formData.ipoDate),
        issueDate: toEpoch(formData.issueDate),
        recordDate: toEpoch(formData.recordDate),
        maturityDate: toEpoch(formData.maturityDate),
      };
      const response = await axiosInstance.post("/stocks/unlisted", payload);
      const result = response.data;

      if (result.success) {
        showToast("Stock added successfully", "success");
        handleCloseModal();
        fetchStocks(1, searchTerm, filterCountryId, filterInvestmentTypes);
      } else {
        showToast(result.message || result.error || "Failed to add stock", "error");
      }
    } catch (error) {
      console.error("Error adding unlisted stock:", error);
      showToast("Failed to add stock. Please try again.", "error");
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setAddStep(1);
    setStepErrors({});
    setFormData({
      countryId: "",
      investmentType: "",
      stockExchangeIds: [],
      symbol: "",
      isin: "",
      stockName: "",
      faceValue: "",
      bseCode: "",
      macroSector: "",
      sector: "",
      industry: "",
      basicIndustry: "",
      broadIndustry: "",
      sectoralIndex: "",
      listingDate: "",
      ipoDate: "",
      issueDate: "",
      recordDate: "",
      maturityDate: "",
      couponRate: "",
      couponFrequency: "",
      series: "",
      issuer: "",
      schemeName: "",
      parentStockId: "",
      status: "",
      description: "",
      slb: false,
      isActive: true,
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
        `/stocks/unlisted/${editingStock.Id}`,
        {
          countryId: editingStock.CountryId,
          investmentType: editingStock.InvestmentTypeId.toString(),
          isin: editingStock.Isin,
          stockName: editingStock.Name,
          faceValue: editingStock.FaceValue,
          symbol: editingStock.Symbol,
          bseCode: editingStock.BseCode,
          macroSector: editingStock.MacroSector,
          sector: editingStock.Sector,
          industry: editingStock.Industry,
          basicIndustry: editingStock.BasicIndustry,
          broadIndustry: editingStock.BroadIndustry,
          sectoralIndex: editingStock.SectoralIndex,
          slb: editingStock.Slb,
          listingDate: editingStock.ListingDate,
          ipoDate: editingStock.IpoDate,
          issueDate: editingStock.IssueDate,
          recordDate: editingStock.RecordDate,
          maturityDate: editingStock.MaturityDate,
          series: editingStock.Series,
          issuer: editingStock.Issuer,
          couponRate: editingStock.CouponRate,
          couponFrequency: editingStock.CouponFrequency,
          schemeName: editingStock.SchemeName,
          parentStockId: editingStock.ParentStockId,
          status: editingStock.Status,
          description: editingStock.Description,
          isActive: editingStock.IsActive,
        },
      );

      if (response.data.success) {
        showToast("Stock updated successfully", "success");
        setIsEditModalOpen(false);
        setEditingStock(null);
        setEditStep(1);
        setEditStepErrors({});
        await fetchStocks(currentPage, searchTerm, filterCountryId, filterInvestmentTypes);
      } else {
        showToast(
          response.data.message || response.data.error || "Failed to update stock",
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
            <h1 className="text-4xl font-bold text-foreground">Unlisted Stocks</h1>
            <p className="mt-2 text-default-500">Manage unlisted stocks directory</p>
          </div>
          <Button color="primary" startContent={<FiPlus />} onPress={() => setIsModalOpen(true)}>
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
            onSelectionChange={(key) => setFilterCountryId((key as string) || "")}
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
          aria-label="Unlisted stocks table"
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
            <TableColumn>FACE VALUE</TableColumn>
            <TableColumn>SECTOR</TableColumn>
            <TableColumn>STATUS</TableColumn>
            <TableColumn>ACTION</TableColumn>
          </TableHeader>
          <TableBody
            emptyContent={isLoading ? "Loading..." : "No stocks found"}
            isLoading={isLoading}
          >
            {stocks.map((stock) => (
              <TableRow key={stock.Id}>
                <TableCell className="font-semibold">{stock.Symbol || "-"}</TableCell>
                <TableCell>{stock.Name}</TableCell>
                <TableCell>{stock.Isin || "-"}</TableCell>
                <TableCell>{stock.FaceValue}</TableCell>
                <TableCell>{stock.Sector || "-"}</TableCell>
                <TableCell>
                  <Chip color={stock.IsActive ? "success" : "default"} size="sm" variant="flat">
                    {stock.IsActive ? "Active" : "Inactive"}
                  </Chip>
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Tooltip content="View details">
                      <Button isIconOnly size="sm" variant="light" onPress={() => handleViewDetails(stock)} aria-label="View details">
                        <FiEye className="text-lg" />
                      </Button>
                    </Tooltip>
                    <Tooltip content="Edit stock">
                      <Button isIconOnly size="sm" variant="light" onPress={() => handleEditStock(stock)} aria-label="Edit stock">
                        <FiEdit2 className="text-lg" />
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
          classNames={{ base: "max-h-[95vh]", wrapper: "items-center", body: "py-6" }}
        >
          <ModalContent>
            {(onClose) => (
              <>
                <ModalHeader className="flex flex-col gap-1 pb-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h2 className="text-xl sm:text-2xl font-bold truncate">{selectedStock?.Name}</h2>
                      <p className="text-sm text-default-500 font-normal">{selectedStock?.Symbol || "No Symbol"}</p>
                    </div>
                    <Chip color={selectedStock?.IsActive ? "success" : "default"} variant="flat" className="self-start sm:self-center">
                      {selectedStock?.IsActive ? "Active" : "Inactive"}
                    </Chip>
                  </div>
                </ModalHeader>
                <Divider />
                <ModalBody className="py-4 px-3 sm:px-6">
                  <Accordion variant="bordered" defaultExpandedKeys={["basic"]} className="gap-2">
                    <AccordionItem key="basic" aria-label="Basic Information" title={<span className="font-semibold text-base sm:text-lg">Basic Information</span>} classNames={{ content: "pb-4 pt-2" }}>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 px-1 sm:px-3">
                        <div className="space-y-1">
                          <p className="text-xs text-default-500">Symbol</p>
                          <div className="flex items-center gap-2">
                            <p className="font-semibold">{selectedStock?.Symbol || "-"}</p>
                            {selectedStock?.Symbol && (
                              <Tooltip content={copiedField === "symbol" ? "Copied!" : "Copy"}>
                                <Button isIconOnly size="sm" variant="light" onPress={() => handleCopyToClipboard(selectedStock.Symbol!, "symbol")}>
                                  {copiedField === "symbol" ? <FiCheck className="text-success" /> : <FiCopy className="text-default-400" />}
                                </Button>
                              </Tooltip>
                            )}
                          </div>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs text-default-500">ISIN</p>
                          <div className="flex items-center gap-2">
                            <p className="font-semibold">{selectedStock?.Isin || "-"}</p>
                            {selectedStock?.Isin && (
                              <Tooltip content={copiedField === "isin" ? "Copied!" : "Copy"}>
                                <Button isIconOnly size="sm" variant="light" onPress={() => handleCopyToClipboard(selectedStock.Isin!, "isin")}>
                                  {copiedField === "isin" ? <FiCheck className="text-success" /> : <FiCopy className="text-default-400" />}
                                </Button>
                              </Tooltip>
                            )}
                          </div>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs text-default-500">Face Value</p>
                          <p className="font-semibold">{selectedStock?.FaceValue}</p>
                        </div>
                        {selectedStock?.BseCode && (
                          <div className="space-y-1">
                            <p className="text-xs text-default-500">BSE Code</p>
                            <div className="flex items-center gap-2">
                              <p className="font-semibold">{selectedStock.BseCode}</p>
                              <Tooltip content={copiedField === "bseCode" ? "Copied!" : "Copy"}>
                                <Button isIconOnly size="sm" variant="light" onPress={() => handleCopyToClipboard(selectedStock.BseCode!, "bseCode")}>
                                  {copiedField === "bseCode" ? <FiCheck className="text-success" /> : <FiCopy className="text-default-400" />}
                                </Button>
                              </Tooltip>
                            </div>
                          </div>
                        )}
                      </div>
                    </AccordionItem>

                    {(selectedStock?.MacroSector || selectedStock?.Sector || selectedStock?.Industry) ? (
                      <AccordionItem key="classification" aria-label="Classification" title={<span className="font-semibold text-base sm:text-lg">Classification</span>} classNames={{ content: "pb-4" }}>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 px-2">
                          {selectedStock?.MacroSector && <div className="space-y-1"><p className="text-xs text-default-500">Macro Sector</p><p className="font-semibold">{selectedStock.MacroSector}</p></div>}
                          {selectedStock?.Sector && <div className="space-y-1"><p className="text-xs text-default-500">Sector</p><p className="font-semibold">{selectedStock.Sector}</p></div>}
                          {selectedStock?.Industry && <div className="space-y-1"><p className="text-xs text-default-500">Industry</p><p className="font-semibold">{selectedStock.Industry}</p></div>}
                        </div>
                      </AccordionItem>
                    ) : null}

                    <AccordionItem key="system" aria-label="System Information" title={<span className="font-semibold text-base sm:text-lg">System Information</span>} classNames={{ content: "pb-4 pt-2" }}>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 px-1 sm:px-3">
                        <div className="space-y-1">
                          <p className="text-xs text-default-500">Stock ID</p>
                          <div className="flex items-center gap-2">
                            <p className="font-mono text-sm break-all">{selectedStock?.Id}</p>
                            <Tooltip content={copiedField === "id" ? "Copied!" : "Copy"}>
                              <Button isIconOnly size="sm" variant="light" onPress={() => handleCopyToClipboard(selectedStock?.Id || "", "id")}>
                                {copiedField === "id" ? <FiCheck className="text-success" /> : <FiCopy className="text-default-400" />}
                              </Button>
                            </Tooltip>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs text-default-500">Country ID</p>
                          <p className="font-semibold">{selectedStock?.CountryId}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs text-default-500">Investment Type ID</p>
                          <p className="font-semibold">{selectedStock?.InvestmentTypeId}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs text-default-500">Listed Status</p>
                          <Chip color={selectedStock?.Listed ? "success" : "default"} size="sm" variant="flat">
                            {selectedStock?.Listed ? "Listed" : "Unlisted"}
                          </Chip>
                        </div>
                      </div>
                    </AccordionItem>
                  </Accordion>
                </ModalBody>
                <Divider />
                <ModalFooter className="px-4 py-3 sm:px-6 sm:py-4">
                  <Button color="primary" variant="flat" onPress={onClose} className="w-full sm:w-auto">Close</Button>
                </ModalFooter>
              </>
            )}
          </ModalContent>
        </Modal>

        {/* Add Stock Modal — Stepper */}
        <Modal isOpen={isModalOpen} onClose={handleCloseModal} size="3xl" scrollBehavior="inside">
          <ModalContent>
            <ModalHeader className="flex flex-col gap-1 pb-2">
              <div className="flex items-center justify-between">
                <span>Add New Unlisted Stock</span>
                <span className="text-sm font-normal text-default-400">Step {addStep} of {ADD_STEPS.length}</span>
              </div>
            </ModalHeader>
            <ModalBody className="pt-2">
              <StepIndicator currentStep={addStep} />
              <div className="mt-4">
                {/* Step 1: Core Info */}
                {addStep === 1 && (
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <CountryAutocomplete
                      name="countryId"
                      label="Country"
                      placeholder="Search country"
                      value={formData.countryId}
                      onSelectionChange={(val) =>
                        setFormData({ ...formData, countryId: val?.toString() || "", stockExchangeIds: [] })
                      }
                      variant="flat"
                      isRequired
                      isInvalid={!!stepErrors.countryId}
                      errorMessage={stepErrors.countryId}
                    />
                    <StockTypeAutocomplete
                      name="investmentType"
                      label="Investment Type"
                      placeholder="Search investment type"
                      value={formData.investmentType}
                      onSelectionChange={(val) =>
                        setFormData({ ...formData, investmentType: val?.toString() || "" })
                      }
                      isRequired
                      isInvalid={!!stepErrors.investmentType}
                      errorMessage={stepErrors.investmentType}
                      size="md"
                    />
                    <div className="md:col-span-2">
                      <StockExchangeAutocomplete
                        label="Stock Exchanges"
                        placeholder="Select exchanges (optional for unlisted)"
                        selectedIds={formData.stockExchangeIds}
                        onSelectionChange={(ids) =>
                          setFormData({ ...formData, stockExchangeIds: ids })
                        }
                        countryId={formData.countryId || null}
                      />
                    </div>
                    <Input
                      label="Symbol"
                      placeholder="e.g. RELIANCE"
                      value={formData.symbol}
                      onChange={(e) => setFormData({ ...formData, symbol: e.target.value })}
                      isRequired
                      isInvalid={!!stepErrors.symbol}
                      errorMessage={stepErrors.symbol}
                    />
                    <Input
                      label="ISIN"
                      placeholder="e.g. INE002A01018"
                      value={formData.isin}
                      onChange={(e) => setFormData({ ...formData, isin: e.target.value })}
                      isRequired
                      isInvalid={!!stepErrors.isin}
                      errorMessage={stepErrors.isin}
                    />
                    <Input
                      label="Stock Name"
                      placeholder="e.g. Reliance Industries Ltd"
                      value={formData.stockName}
                      onChange={(e) => setFormData({ ...formData, stockName: e.target.value })}
                      isRequired
                      isInvalid={!!stepErrors.stockName}
                      errorMessage={stepErrors.stockName}
                    />
                    <Input
                      label="Face Value"
                      type="number"
                      placeholder="e.g. 10"
                      min="0"
                      step="0.01"
                      value={formData.faceValue}
                      onChange={(e) => setFormData({ ...formData, faceValue: e.target.value })}
                      isRequired
                      isInvalid={!!stepErrors.faceValue}
                      errorMessage={stepErrors.faceValue}
                    />
                    <Input
                      label="BSE Code"
                      placeholder="e.g. 500325"
                      value={formData.bseCode}
                      onChange={(e) => setFormData({ ...formData, bseCode: e.target.value })}
                    />
                  </div>
                )}

                {/* Step 2: Classification */}
                {addStep === 2 && (
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <Input label="Macro Sector" placeholder="e.g. Energy" value={formData.macroSector} onChange={(e) => setFormData({ ...formData, macroSector: e.target.value })} />
                    <Input label="Sector" placeholder="e.g. Oil & Gas" value={formData.sector} onChange={(e) => setFormData({ ...formData, sector: e.target.value })} />
                    <Input label="Industry" placeholder="e.g. Integrated Oil & Gas" value={formData.industry} onChange={(e) => setFormData({ ...formData, industry: e.target.value })} />
                    <Input label="Basic Industry" placeholder="e.g. Refineries" value={formData.basicIndustry} onChange={(e) => setFormData({ ...formData, basicIndustry: e.target.value })} />
                    <Input label="Broad Industry" placeholder="e.g. Petroleum Products" value={formData.broadIndustry} onChange={(e) => setFormData({ ...formData, broadIndustry: e.target.value })} />
                    <Input label="Sectoral Index" placeholder="e.g. NIFTY 50" value={formData.sectoralIndex} onChange={(e) => setFormData({ ...formData, sectoralIndex: e.target.value })} />
                  </div>
                )}

                {/* Step 3: Dates & Instrument */}
                {addStep === 3 && (
                  <div className="space-y-5">
                    <div>
                      <p className="text-sm font-medium text-default-600 mb-3">Key Dates</p>
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <Input label="Listing Date" type="date" value={formData.listingDate} onChange={(e) => setFormData({ ...formData, listingDate: e.target.value })} />
                        <Input label="IPO Date" type="date" value={formData.ipoDate} onChange={(e) => setFormData({ ...formData, ipoDate: e.target.value })} />
                        <Input label="Issue Date" type="date" value={formData.issueDate} onChange={(e) => setFormData({ ...formData, issueDate: e.target.value })} />
                        <Input label="Record Date" type="date" value={formData.recordDate} onChange={(e) => setFormData({ ...formData, recordDate: e.target.value })} />
                        <Input label="Maturity Date" type="date" value={formData.maturityDate} onChange={(e) => setFormData({ ...formData, maturityDate: e.target.value })} />
                      </div>
                    </div>
                    <Divider />
                    <div>
                      <p className="text-sm font-medium text-default-600 mb-3">Instrument Details</p>
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <Input label="Coupon Rate (%)" type="number" placeholder="e.g. 7.50" step="0.01" min="0" value={formData.couponRate} onChange={(e) => setFormData({ ...formData, couponRate: e.target.value })} />
                        <Input label="Coupon Frequency" placeholder="e.g. Annual, Semi-Annual" value={formData.couponFrequency} onChange={(e) => setFormData({ ...formData, couponFrequency: e.target.value })} />
                        <Input label="Series" placeholder="e.g. Series A" value={formData.series} onChange={(e) => setFormData({ ...formData, series: e.target.value })} />
                        <Input label="Issuer" placeholder="e.g. Government of India" value={formData.issuer} onChange={(e) => setFormData({ ...formData, issuer: e.target.value })} />
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 4: Settings */}
                {addStep === 4 && (
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <Input label="Scheme Name" placeholder="e.g. Growth Fund" value={formData.schemeName} onChange={(e) => setFormData({ ...formData, schemeName: e.target.value })} />
                    <Input label="Status" placeholder="e.g. Active, Suspended" value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })} />
                    <div className="md:col-span-2">
                      <Input label="Description" placeholder="Brief description of the stock" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
                    </div>
                    <div className="md:col-span-2">
                      <StockAutocomplete
                        name="parentStockId"
                        label="Parent Stock"
                        placeholder="Search parent stock by name, symbol or ISIN"
                        value={formData.parentStockId || undefined}
                        onSelectionChange={(stockId) =>
                          setFormData({ ...formData, parentStockId: stockId || "" })
                        }
                        description="Leave blank if this is not a derivative or linked instrument"
                      />
                    </div>
                    <div className="md:col-span-2 flex items-center gap-8 pt-2">
                      <Switch isSelected={formData.slb} onValueChange={(val) => setFormData({ ...formData, slb: val })}>
                        <span className="text-sm">SLB Eligible</span>
                      </Switch>
                      <Switch isSelected={formData.isActive} onValueChange={(val) => setFormData({ ...formData, isActive: val })}>
                        <span className="text-sm">Active</span>
                      </Switch>
                    </div>
                  </div>
                )}
              </div>
            </ModalBody>
            <ModalFooter>
              <Button variant="flat" onPress={handleCloseModal}>Cancel</Button>
              <div className="flex gap-2 ml-auto">
                {addStep > 1 && (
                  <Button variant="flat" startContent={<FiChevronLeft className="text-sm" />} onPress={handleBack}>Back</Button>
                )}
                {addStep < ADD_STEPS.length ? (
                  <Button color="primary" endContent={<FiChevronRight className="text-sm" />} onPress={handleNext}>Next</Button>
                ) : (
                  <Button color="primary" onPress={handleAddStock}>Add Stock</Button>
                )}
              </div>
            </ModalFooter>
          </ModalContent>
        </Modal>

        {/* Edit Stock Modal — Stepper */}
        <Modal
          isOpen={isEditModalOpen}
          onClose={() => { setIsEditModalOpen(false); setEditStep(1); setEditStepErrors({}); }}
          size="3xl"
          scrollBehavior="inside"
        >
          <ModalContent>
            <ModalHeader className="flex flex-col gap-1 pb-2">
              <div className="flex items-center justify-between">
                <span>Edit Unlisted Stock</span>
                <span className="text-sm font-normal text-default-400">Step {editStep} of {ADD_STEPS.length}</span>
              </div>
            </ModalHeader>
            <ModalBody className="pt-2">
              {editingStock && (
                <>
                  <StepIndicator currentStep={editStep} />
                  <div className="mt-4">
                    {/* Step 1: Core Info */}
                    {editStep === 1 && (
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <CountryAutocomplete
                          name="countryId"
                          label="Country"
                          placeholder="Search country"
                          value={editingStock.CountryId}
                          onSelectionChange={(val) =>
                            setEditingStock({ ...editingStock, CountryId: val || 0 })
                          }
                          variant="flat"
                          isRequired
                          isInvalid={!!editStepErrors.countryId}
                          errorMessage={editStepErrors.countryId}
                        />
                        <StockTypeAutocomplete
                          name="investmentType"
                          label="Investment Type"
                          placeholder="Search investment type"
                          value={editingStock.InvestmentTypeId}
                          onSelectionChange={(val) =>
                            setEditingStock({ ...editingStock, InvestmentTypeId: val || 0 })
                          }
                          isRequired
                          isInvalid={!!editStepErrors.investmentType}
                          errorMessage={editStepErrors.investmentType}
                          size="md"
                        />
                        <Input
                          label="Symbol"
                          placeholder="e.g. RELIANCE"
                          value={editingStock.Symbol || ""}
                          onChange={(e) => setEditingStock({ ...editingStock, Symbol: e.target.value || null })}
                          isRequired
                          isInvalid={!!editStepErrors.symbol}
                          errorMessage={editStepErrors.symbol}
                        />
                        <Input
                          label="ISIN"
                          placeholder="e.g. INE002A01018"
                          value={editingStock.Isin || ""}
                          onChange={(e) => setEditingStock({ ...editingStock, Isin: e.target.value || null })}
                          isRequired
                          isInvalid={!!editStepErrors.isin}
                          errorMessage={editStepErrors.isin}
                        />
                        <Input
                          label="Stock Name"
                          placeholder="e.g. Reliance Industries Ltd"
                          value={editingStock.Name}
                          onChange={(e) => setEditingStock({ ...editingStock, Name: e.target.value })}
                          isRequired
                          isInvalid={!!editStepErrors.stockName}
                          errorMessage={editStepErrors.stockName}
                        />
                        <Input
                          label="Face Value"
                          type="number"
                          placeholder="e.g. 10"
                          min="0"
                          step="0.01"
                          value={editingStock.FaceValue.toString()}
                          onChange={(e) => setEditingStock({ ...editingStock, FaceValue: parseFloat(e.target.value) || 0 })}
                          isRequired
                          isInvalid={!!editStepErrors.faceValue}
                          errorMessage={editStepErrors.faceValue}
                        />
                        <Input
                          label="BSE Code"
                          placeholder="e.g. 500325"
                          value={editingStock.BseCode || ""}
                          onChange={(e) => setEditingStock({ ...editingStock, BseCode: e.target.value || null })}
                        />
                      </div>
                    )}

                    {/* Step 2: Classification */}
                    {editStep === 2 && (
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <Input label="Macro Sector" placeholder="e.g. Energy" value={editingStock.MacroSector || ""} onChange={(e) => setEditingStock({ ...editingStock, MacroSector: e.target.value || null })} />
                        <Input label="Sector" placeholder="e.g. Oil & Gas" value={editingStock.Sector || ""} onChange={(e) => setEditingStock({ ...editingStock, Sector: e.target.value || null })} />
                        <Input label="Industry" placeholder="e.g. Integrated Oil & Gas" value={editingStock.Industry || ""} onChange={(e) => setEditingStock({ ...editingStock, Industry: e.target.value || null })} />
                        <Input label="Basic Industry" placeholder="e.g. Refineries" value={editingStock.BasicIndustry || ""} onChange={(e) => setEditingStock({ ...editingStock, BasicIndustry: e.target.value || null })} />
                        <Input label="Broad Industry" placeholder="e.g. Petroleum Products" value={editingStock.BroadIndustry || ""} onChange={(e) => setEditingStock({ ...editingStock, BroadIndustry: e.target.value || null })} />
                        <Input label="Sectoral Index" placeholder="e.g. NIFTY 50" value={editingStock.SectoralIndex || ""} onChange={(e) => setEditingStock({ ...editingStock, SectoralIndex: e.target.value || null })} />
                      </div>
                    )}

                    {/* Step 3: Dates & Instrument */}
                    {editStep === 3 && (
                      <div className="space-y-5">
                        <div>
                          <p className="text-sm font-medium text-default-600 mb-3">Key Dates</p>
                          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <Input label="Listing Date" type="date" value={epochToDateInput(editingStock.ListingDate)} onChange={(e) => setEditingStock({ ...editingStock, ListingDate: toEpoch(e.target.value) })} />
                            <Input label="IPO Date" type="date" value={epochToDateInput(editingStock.IpoDate)} onChange={(e) => setEditingStock({ ...editingStock, IpoDate: toEpoch(e.target.value) })} />
                            <Input label="Issue Date" type="date" value={epochToDateInput(editingStock.IssueDate)} onChange={(e) => setEditingStock({ ...editingStock, IssueDate: toEpoch(e.target.value) })} />
                            <Input label="Record Date" type="date" value={epochToDateInput(editingStock.RecordDate)} onChange={(e) => setEditingStock({ ...editingStock, RecordDate: toEpoch(e.target.value) })} />
                            <Input label="Maturity Date" type="date" value={epochToDateInput(editingStock.MaturityDate)} onChange={(e) => setEditingStock({ ...editingStock, MaturityDate: toEpoch(e.target.value) })} />
                          </div>
                        </div>
                        <Divider />
                        <div>
                          <p className="text-sm font-medium text-default-600 mb-3">Instrument Details</p>
                          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <Input label="Coupon Rate (%)" type="number" placeholder="e.g. 7.50" step="0.01" min="0" value={editingStock.CouponRate?.toString() || ""} onChange={(e) => setEditingStock({ ...editingStock, CouponRate: e.target.value ? parseFloat(e.target.value) : null })} />
                            <Input label="Coupon Frequency" placeholder="e.g. Annual, Semi-Annual" value={editingStock.CouponFrequency || ""} onChange={(e) => setEditingStock({ ...editingStock, CouponFrequency: e.target.value || null })} />
                            <Input label="Series" placeholder="e.g. Series A" value={editingStock.Series || ""} onChange={(e) => setEditingStock({ ...editingStock, Series: e.target.value || null })} />
                            <Input label="Issuer" placeholder="e.g. Government of India" value={editingStock.Issuer || ""} onChange={(e) => setEditingStock({ ...editingStock, Issuer: e.target.value || null })} />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Step 4: Settings */}
                    {editStep === 4 && (
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <Input label="Scheme Name" placeholder="e.g. Growth Fund" value={editingStock.SchemeName || ""} onChange={(e) => setEditingStock({ ...editingStock, SchemeName: e.target.value || null })} />
                        <Input label="Status" placeholder="e.g. Active, Suspended" value={editingStock.Status || ""} onChange={(e) => setEditingStock({ ...editingStock, Status: e.target.value || null })} />
                        <div className="md:col-span-2">
                          <Input label="Description" placeholder="Brief description of the stock" value={editingStock.Description || ""} onChange={(e) => setEditingStock({ ...editingStock, Description: e.target.value || null })} />
                        </div>
                        <div className="md:col-span-2">
                          <StockAutocomplete
                            name="parentStockId"
                            label="Parent Stock"
                            placeholder="Search parent stock by name, symbol or ISIN"
                            value={editingStock.ParentStockId || undefined}
                            onSelectionChange={(stockId) =>
                              setEditingStock({ ...editingStock, ParentStockId: stockId })
                            }
                            description="Leave blank if this is not a derivative or linked instrument"
                          />
                        </div>
                        <div className="md:col-span-2 flex items-center gap-8 pt-2">
                          <Switch isSelected={editingStock.Slb || false} onValueChange={(val) => setEditingStock({ ...editingStock, Slb: val })}>
                            <span className="text-sm">SLB Eligible</span>
                          </Switch>
                          <Switch isSelected={editingStock.IsActive} onValueChange={(val) => setEditingStock({ ...editingStock, IsActive: val })}>
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
              <Button variant="flat" onPress={() => { setIsEditModalOpen(false); setEditStep(1); setEditStepErrors({}); }}>Cancel</Button>
              <div className="flex gap-2 ml-auto">
                {editStep > 1 && (
                  <Button variant="flat" startContent={<FiChevronLeft className="text-sm" />} onPress={handleEditBack}>Back</Button>
                )}
                {editStep < ADD_STEPS.length ? (
                  <Button color="primary" endContent={<FiChevronRight className="text-sm" />} onPress={handleEditNext}>Next</Button>
                ) : (
                  <Button color="primary" onPress={handleSaveStock} isLoading={isSaving}>Save Changes</Button>
                )}
              </div>
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
