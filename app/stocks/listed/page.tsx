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
} from "react-icons/fi";
import { createClient } from "@/lib/supabase/client";
import axiosInstance from "@/lib/axios";
import StockTypeAutocomplete from "@/components/StockTypeAutocomplete";

interface Stock {
  Id: string;
  CountryId: number;
  InvestmentTypeId: number;
  Isin: string;
  Name: string;
  FaceValue: number;
  Listed: boolean;
  Symbol: string;
  BseCode: string | null;
  MacroSector: string | null;
  Sector: string | null;
  Industry: string | null;
  BasicIndustry: string | null;
  SectoralIndex: string | null;
  Slb: boolean | null;
  ListingDate: number | null;
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

interface Exchange {
  Id: number;
  Name: string;
  ShortCode: string;
}

export default function ListedStocksPage() {
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [investmentTypes, setInvestmentTypes] = useState<InvestmentType[]>([]);
  const [exchanges, setExchanges] = useState<Exchange[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedStock, setSelectedStock] = useState<Stock | null>(null);
  const [editingStock, setEditingStock] = useState<Stock | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);
  const router = useRouter();
  const supabase = createClient();

  // Form state
  const [formData, setFormData] = useState({
    countryId: "",
    investmentType: "",
    stockExchangeIds: [] as number[],
    isin: "",
    stockName: "",
    faceValue: "",
    symbol: "",
    bseCode: "",
    macroSector: "",
    sector: "",
    industry: "",
    basicIndustry: "",
    sectoralIndex: "",
    slb: false,
    isActive: true,
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
      fetchExchanges();
    };

    checkAuth();
  }, [router, supabase.auth]);

  // Debounced search effect
  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentPage(1); // Reset to first page on search
      fetchStocks(1, searchTerm);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch stocks when page changes
  useEffect(() => {
    fetchStocks(currentPage, searchTerm);
  }, [currentPage]);

  const fetchStocks = async (page: number = 1, search: string = "") => {
    try {
      setIsLoading(true);

      // Build query params
      const params = new URLSearchParams();
      params.append("page", page.toString());
      params.append("limit", "50");

      // Send search term to all searchable fields (OR logic in SQL)
      if (search.trim()) {
        params.append("symbol", search);
        params.append("isin", search);
        params.append("stockName", search);
        params.append("bseCode", search);
      }

      const response = await axiosInstance.get(
        `/stocks/listed?${params.toString()}`
      );
      const result = response.data;

      if (result.success) {
        setStocks(result.data);
        setHasMore(result.pagination?.hasMore || false);
      } else {
        console.error("Failed to fetch listed stocks:", result.error);
      }
    } catch (error) {
      console.error("Error fetching listed stocks:", error);
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

  const fetchExchanges = async () => {
    try {
      const response = await axiosInstance.get("/exchange");
      const result = response.data;
      if (result.success) {
        setExchanges(result.data);
      }
    } catch (error) {
      console.error("Error fetching exchanges:", error);
    }
  };

  const handleAddStock = async () => {
    try {
      // Send formData directly - investmentType is already stored as ID string
      const response = await axiosInstance.post("/stocks/listed", formData);
      const result = response.data;

      if (result.success) {
        showToast("Stock added successfully", "success");
        handleCloseModal();
        fetchStocks();
      } else {
        showToast(
          result.message || result.error || "Failed to add stock",
          "error"
        );
      }
    } catch (error) {
      console.error("Error adding listed stock:", error);
      showToast("Failed to add stock. Please try again.", "error");
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setFormData({
      countryId: "",
      investmentType: "",
      stockExchangeIds: [],
      isin: "",
      stockName: "",
      faceValue: "",
      symbol: "",
      bseCode: "",
      macroSector: "",
      sector: "",
      industry: "",
      basicIndustry: "",
      sectoralIndex: "",
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
    setIsEditModalOpen(true);
  };

  const handleSaveStock = async () => {
    if (!editingStock) return;

    try {
      setIsSaving(true);

      const response = await axiosInstance.put(
        `/stocks/listed/${editingStock.Id}`,
        {
          countryId: editingStock.CountryId,
          investmentType: editingStock.InvestmentTypeId.toString(), // Send ID as string
          isin: editingStock.Isin,
          stockName: editingStock.Name,
          faceValue: editingStock.FaceValue,
          symbol: editingStock.Symbol,
          bseCode: editingStock.BseCode,
          macroSector: editingStock.MacroSector,
          sector: editingStock.Sector,
          industry: editingStock.Industry,
          basicIndustry: editingStock.BasicIndustry,
          sectoralIndex: editingStock.SectoralIndex,
          slb: editingStock.Slb,
          listingDate: editingStock.ListingDate,
          isActive: editingStock.IsActive,
        }
      );

      if (response.data.success) {
        showToast("Stock updated successfully", "success");
        setIsEditModalOpen(false);
        setEditingStock(null);
        await fetchStocks(currentPage, searchTerm);
      } else {
        showToast(
          response.data.message ||
            response.data.error ||
            "Failed to update stock",
          "error"
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
            <h1 className="text-4xl font-bold text-foreground">
              Listed Stocks
            </h1>
            <p className="mt-2 text-default-500">
              Manage listed stocks directory
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

        {/* Search */}
        <div className="mb-4">
          <Input
            placeholder="Search by name, symbol, or ISIN..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            startContent={<FiSearch />}
            className="max-w-md"
          />
        </div>

        {/* Stocks Table */}
        <div className="max-h-[calc(100vh-340px)] overflow-auto">
          <Table aria-label="Listed stocks table" isHeaderSticky>
            <TableHeader>
              <TableColumn>SYMBOL</TableColumn>
              <TableColumn>NAME</TableColumn>
              <TableColumn>ISIN</TableColumn>
              <TableColumn>FACE VALUE</TableColumn>
              <TableColumn>SECTOR</TableColumn>
              <TableColumn>LISTING DATE</TableColumn>
              <TableColumn>STATUS</TableColumn>
              <TableColumn>ACTION</TableColumn>
            </TableHeader>
            <TableBody
              emptyContent={isLoading ? "Loading..." : "No stocks found"}
              isLoading={isLoading}
            >
              {stocks.map((stock) => (
                <TableRow key={stock.Id}>
                  <TableCell className="font-semibold">
                    {stock.Symbol}
                  </TableCell>
                  <TableCell>{stock.Name}</TableCell>
                  <TableCell>{stock.Isin}</TableCell>
                  <TableCell>{stock.FaceValue}</TableCell>
                  <TableCell>{stock.Sector || "-"}</TableCell>
                  <TableCell>
                    {stock.ListingDate
                      ? (() => {
                          const date = new Date(stock.ListingDate * 1000);
                          const day = String(date.getDate()).padStart(2, "0");
                          const month = String(date.getMonth() + 1).padStart(
                            2,
                            "0"
                          );
                          const year = date.getFullYear();
                          return `${day}/${month}/${year}`;
                        })()
                      : "-"}
                  </TableCell>
                  <TableCell>
                    <Chip
                      color={stock.IsActive ? "success" : "default"}
                      size="sm"
                      variant="flat"
                    >
                      {stock.IsActive ? "Active" : "Inactive"}
                    </Chip>
                  </TableCell>
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
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

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
                        {selectedStock?.Name}
                      </h2>
                      <p className="text-sm text-default-500 font-normal">
                        {selectedStock?.Symbol}
                      </p>
                    </div>
                    <Chip
                      color={selectedStock?.IsActive ? "success" : "default"}
                      variant="flat"
                      className="self-start sm:self-center"
                    >
                      {selectedStock?.IsActive ? "Active" : "Inactive"}
                    </Chip>
                  </div>
                </ModalHeader>
                <Divider />
                <ModalBody className="py-4 px-3 sm:px-6">
                  <Accordion
                    variant="bordered"
                    defaultExpandedKeys={["basic"]}
                    className="gap-2"
                  >
                    {/* Basic Information */}
                    <AccordionItem
                      key="basic"
                      aria-label="Basic Information"
                      title={
                        <span className="font-semibold text-base sm:text-lg">
                          Basic Information
                        </span>
                      }
                      classNames={{
                        content: "pb-4 pt-2",
                      }}
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 px-1 sm:px-3">
                        <div className="space-y-1">
                          <p className="text-xs text-default-500">Symbol</p>
                          <div className="flex items-center gap-2">
                            <p className="font-semibold">
                              {selectedStock?.Symbol}
                            </p>
                            <Tooltip
                              content={
                                copiedField === "symbol" ? "Copied!" : "Copy"
                              }
                            >
                              <Button
                                isIconOnly
                                size="sm"
                                variant="light"
                                onPress={() =>
                                  handleCopyToClipboard(
                                    selectedStock?.Symbol || "",
                                    "symbol"
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

                        <div className="space-y-1">
                          <p className="text-xs text-default-500">ISIN</p>
                          <div className="flex items-center gap-2">
                            <p className="font-semibold">
                              {selectedStock?.Isin}
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
                                    selectedStock?.Isin || "",
                                    "isin"
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

                        <div className="space-y-1">
                          <p className="text-xs text-default-500">Face Value</p>
                          <p className="font-semibold">
                            {selectedStock?.FaceValue}
                          </p>
                        </div>

                        {selectedStock?.BseCode && (
                          <div className="space-y-1">
                            <p className="text-xs text-default-500">BSE Code</p>
                            <div className="flex items-center gap-2">
                              <p className="font-semibold">
                                {selectedStock.BseCode}
                              </p>
                              <Tooltip
                                content={
                                  copiedField === "bseCode" ? "Copied!" : "Copy"
                                }
                              >
                                <Button
                                  isIconOnly
                                  size="sm"
                                  variant="light"
                                  onPress={() =>
                                    handleCopyToClipboard(
                                      selectedStock.BseCode!,
                                      "bseCode"
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

                        {selectedStock?.ListingDate && (
                          <div className="space-y-1">
                            <p className="text-xs text-default-500">
                              Listing Date
                            </p>
                            <p className="font-semibold">
                              {(() => {
                                const date = new Date(
                                  selectedStock.ListingDate * 1000
                                );
                                const day = String(date.getDate()).padStart(
                                  2,
                                  "0"
                                );
                                const month = String(
                                  date.getMonth() + 1
                                ).padStart(2, "0");
                                const year = date.getFullYear();
                                return `${day}/${month}/${year}`;
                              })()}
                            </p>
                          </div>
                        )}
                      </div>
                    </AccordionItem>

                    {selectedStock?.MacroSector ||
                    selectedStock?.Sector ||
                    selectedStock?.Industry ? (
                      <AccordionItem
                        key="classification"
                        aria-label="Classification"
                        title={
                          <span className="font-semibold text-base sm:text-lg">
                            Classification
                          </span>
                        }
                        classNames={{
                          content: "pb-4",
                        }}
                      >
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 px-2">
                          {selectedStock?.MacroSector && (
                            <div className="space-y-1">
                              <p className="text-xs text-default-500">
                                Macro Sector
                              </p>
                              <p className="font-semibold">
                                {selectedStock.MacroSector}
                              </p>
                            </div>
                          )}

                          {selectedStock?.Sector && (
                            <div className="space-y-1">
                              <p className="text-xs text-default-500">Sector</p>
                              <p className="font-semibold">
                                {selectedStock.Sector}
                              </p>
                            </div>
                          )}

                          {selectedStock?.Industry && (
                            <div className="space-y-1">
                              <p className="text-xs text-default-500">
                                Industry
                              </p>
                              <p className="font-semibold">
                                {selectedStock.Industry}
                              </p>
                            </div>
                          )}
                        </div>
                      </AccordionItem>
                    ) : null}

                    {/* System Information */}
                    <AccordionItem
                      key="system"
                      aria-label="System Information"
                      title={
                        <span className="font-semibold text-base sm:text-lg">
                          System Information
                        </span>
                      }
                      classNames={{
                        content: "pb-4 pt-2",
                      }}
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 px-1 sm:px-3">
                        <div className="space-y-1">
                          <p className="text-xs text-default-500">Stock ID</p>
                          <div className="flex items-center gap-2">
                            <p className="font-mono text-sm break-all">
                              {selectedStock?.Id}
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
                                    selectedStock?.Id || "",
                                    "id"
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

                        <div className="space-y-1">
                          <p className="text-xs text-default-500">Country ID</p>
                          <p className="font-semibold">
                            {selectedStock?.CountryId}
                          </p>
                        </div>

                        <div className="space-y-1">
                          <p className="text-xs text-default-500">
                            Investment Type ID
                          </p>
                          <p className="font-semibold">
                            {selectedStock?.InvestmentTypeId}
                          </p>
                        </div>

                        <div className="space-y-1">
                          <p className="text-xs text-default-500">
                            Listed Status
                          </p>
                          <Chip
                            color={
                              selectedStock?.Listed ? "success" : "default"
                            }
                            size="sm"
                            variant="flat"
                          >
                            {selectedStock?.Listed ? "Listed" : "Unlisted"}
                          </Chip>
                        </div>
                      </div>
                    </AccordionItem>
                  </Accordion>
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

        {/* Add Stock Modal */}
        <Modal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          size="3xl"
          scrollBehavior="inside"
        >
          <ModalContent>
            <ModalHeader>Add New Listed Stock</ModalHeader>
            <ModalBody>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Input
                  label="Symbol *"
                  placeholder="Enter stock symbol"
                  value={formData.symbol}
                  onChange={(e) =>
                    setFormData({ ...formData, symbol: e.target.value })
                  }
                  required
                />
                <Input
                  label="Stock Name *"
                  placeholder="Enter stock name"
                  value={formData.stockName}
                  onChange={(e) =>
                    setFormData({ ...formData, stockName: e.target.value })
                  }
                  required
                />
                <Input
                  label="ISIN *"
                  placeholder="Enter ISIN"
                  value={formData.isin}
                  onChange={(e) =>
                    setFormData({ ...formData, isin: e.target.value })
                  }
                  required
                />
                <Input
                  label="Face Value *"
                  type="number"
                  placeholder="Enter face value"
                  value={formData.faceValue}
                  onChange={(e) =>
                    setFormData({ ...formData, faceValue: e.target.value })
                  }
                  required
                />
                <Autocomplete
                  label="Country *"
                  placeholder="Search country"
                  selectedKey={formData.countryId}
                  onSelectionChange={(key) =>
                    setFormData({ ...formData, countryId: key as string })
                  }
                  isRequired
                >
                  {countries.map((country) => (
                    <AutocompleteItem key={country.Id}>
                      {country.Name}
                    </AutocompleteItem>
                  ))}
                </Autocomplete>
                <StockTypeAutocomplete
                  name="investmentType"
                  label="Investment Type *"
                  placeholder="Search investment type"
                  value={formData.investmentType}
                  onSelectionChange={(value) =>
                    setFormData({
                      ...formData,
                      investmentType: value?.toString() || "",
                    })
                  }
                  isRequired
                  size="md"
                />
                <Input
                  label="BSE Code"
                  placeholder="Enter BSE code"
                  value={formData.bseCode}
                  onChange={(e) =>
                    setFormData({ ...formData, bseCode: e.target.value })
                  }
                />
                <Input
                  label="Macro Sector"
                  placeholder="Enter macro sector"
                  value={formData.macroSector}
                  onChange={(e) =>
                    setFormData({ ...formData, macroSector: e.target.value })
                  }
                />
                <Input
                  label="Sector"
                  placeholder="Enter sector"
                  value={formData.sector}
                  onChange={(e) =>
                    setFormData({ ...formData, sector: e.target.value })
                  }
                />
                <Input
                  label="Industry"
                  placeholder="Enter industry"
                  value={formData.industry}
                  onChange={(e) =>
                    setFormData({ ...formData, industry: e.target.value })
                  }
                />
                <div className="flex items-center gap-4">
                  <Switch
                    isSelected={formData.slb}
                    onValueChange={(value) =>
                      setFormData({ ...formData, slb: value })
                    }
                  >
                    SLB
                  </Switch>
                  <Switch
                    isSelected={formData.isActive}
                    onValueChange={(value) =>
                      setFormData({ ...formData, isActive: value })
                    }
                  >
                    Active
                  </Switch>
                </div>
              </div>
            </ModalBody>
            <ModalFooter>
              <Button variant="flat" onPress={handleCloseModal}>
                Cancel
              </Button>
              <Button color="primary" onPress={handleAddStock}>
                Add Stock
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>

        {/* Edit Stock Modal */}
        <Modal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          size="3xl"
          scrollBehavior="inside"
        >
          <ModalContent>
            <ModalHeader>Edit Listed Stock</ModalHeader>
            <ModalBody>
              {editingStock && (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Input
                    label="Symbol"
                    placeholder="Enter stock symbol"
                    value={editingStock.Symbol}
                    onChange={(e) =>
                      setEditingStock({
                        ...editingStock,
                        Symbol: e.target.value,
                      })
                    }
                    isRequired
                  />
                  <Input
                    label="Stock Name"
                    placeholder="Enter stock name"
                    value={editingStock.Name}
                    onChange={(e) =>
                      setEditingStock({ ...editingStock, Name: e.target.value })
                    }
                    isRequired
                  />
                  <Input
                    label="ISIN"
                    placeholder="Enter ISIN"
                    value={editingStock.Isin}
                    onChange={(e) =>
                      setEditingStock({ ...editingStock, Isin: e.target.value })
                    }
                    isRequired
                  />
                  <Input
                    label="Face Value"
                    type="number"
                    placeholder="Enter face value"
                    value={editingStock.FaceValue.toString()}
                    onChange={(e) =>
                      setEditingStock({
                        ...editingStock,
                        FaceValue: parseFloat(e.target.value) || 0,
                      })
                    }
                    isRequired
                  />
                  <Autocomplete
                    label="Country"
                    placeholder="Search country"
                    selectedKey={editingStock.CountryId.toString()}
                    onSelectionChange={(key) =>
                      setEditingStock({
                        ...editingStock,
                        CountryId: parseInt(key as string),
                      })
                    }
                    isRequired
                  >
                    {countries.map((country) => (
                      <AutocompleteItem key={country.Id.toString()}>
                        {country.Name}
                      </AutocompleteItem>
                    ))}
                  </Autocomplete>
                  <StockTypeAutocomplete
                    name="investmentType"
                    label="Investment Type"
                    placeholder="Search investment type"
                    value={editingStock.InvestmentTypeId}
                    onSelectionChange={(value) =>
                      setEditingStock({
                        ...editingStock,
                        InvestmentTypeId: value || 0,
                      })
                    }
                    isRequired
                    size="md"
                  />
                  <Input
                    label="BSE Code"
                    placeholder="Enter BSE code"
                    value={editingStock.BseCode || ""}
                    onChange={(e) =>
                      setEditingStock({
                        ...editingStock,
                        BseCode: e.target.value || null,
                      })
                    }
                  />
                  <Input
                    label="Macro Sector"
                    placeholder="Enter macro sector"
                    value={editingStock.MacroSector || ""}
                    onChange={(e) =>
                      setEditingStock({
                        ...editingStock,
                        MacroSector: e.target.value || null,
                      })
                    }
                  />
                  <Input
                    label="Sector"
                    placeholder="Enter sector"
                    value={editingStock.Sector || ""}
                    onChange={(e) =>
                      setEditingStock({
                        ...editingStock,
                        Sector: e.target.value || null,
                      })
                    }
                  />
                  <Input
                    label="Industry"
                    placeholder="Enter industry"
                    value={editingStock.Industry || ""}
                    onChange={(e) =>
                      setEditingStock({
                        ...editingStock,
                        Industry: e.target.value || null,
                      })
                    }
                  />
                  <Input
                    label="Basic Industry"
                    placeholder="Enter basic industry"
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
                    placeholder="Enter sectoral index"
                    value={editingStock.SectoralIndex || ""}
                    onChange={(e) =>
                      setEditingStock({
                        ...editingStock,
                        SectoralIndex: e.target.value || null,
                      })
                    }
                  />
                  <div className="flex items-center gap-4">
                    <Switch
                      isSelected={editingStock.Slb || false}
                      onValueChange={(value) =>
                        setEditingStock({ ...editingStock, Slb: value })
                      }
                    >
                      SLB
                    </Switch>
                    <Switch
                      isSelected={editingStock.IsActive}
                      onValueChange={(value) =>
                        setEditingStock({ ...editingStock, IsActive: value })
                      }
                    >
                      Active
                    </Switch>
                  </div>
                </div>
              )}
            </ModalBody>
            <ModalFooter>
              <Button variant="light" onPress={() => setIsEditModalOpen(false)}>
                Cancel
              </Button>
              <Button
                color="primary"
                onPress={handleSaveStock}
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
