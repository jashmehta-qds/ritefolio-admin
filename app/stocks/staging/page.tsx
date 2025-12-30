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
} from "react-icons/fi";
import { createClient } from "@/lib/supabase/client";
import axiosInstance from "@/lib/axios";
import StockTypeAutocomplete from "@/components/StockTypeAutocomplete";

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

export default function StagingStocksPage() {
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
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
    symbol: "",
    isin: "",
    bseCode: "",
    stockName: "",
    countryId: "",
    investmentType: "",
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
        `/stocks/staging?${params.toString()}`
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

  const handleAddStock = async () => {
    try {
      // Get user ID from Supabase
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
        fetchStocks();
      } else {
        showToast(
          result.message || result.error || "Failed to add stock",
          "error"
        );
      }
    } catch (error) {
      console.error("Error adding staging stock:", error);
      showToast("Failed to add stock. Please try again.", "error");
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setFormData({
      symbol: "",
      isin: "",
      bseCode: "",
      stockName: "",
      countryId: "",
      investmentType: "",
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

  const handleMigrateStock = (stock: Stock) => {
    setMigratingStock(stock);
    setIsMigrateModalOpen(true);
  };

  const handleConfirmMigrate = async () => {
    if (!migratingStock) return;

    try {
      setIsMigrating(true);

      const response = await axiosInstance.post(
        `/stocks/staging/${migratingStock.Id}/migrate`
      );

      if (response.data.success) {
        showToast(
          "Stock migrated to listed stocks successfully",
          "success"
        );
        setIsMigrateModalOpen(false);
        setMigratingStock(null);
        await fetchStocks(currentPage, searchTerm);
      } else {
        showToast(
          response.data.message ||
            response.data.error ||
            "Failed to migrate stock",
          "error"
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

        {/* Search */}
        <div className="mb-4">
          <Input
            placeholder="Search by name, symbol, ISIN, or BSE code..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            startContent={<FiSearch />}
            className="max-w-md"
          />
        </div>

        {/* Stocks Table */}
        <div className="max-h-[calc(100vh-340px)] overflow-auto">
          <Table aria-label="Staging stocks table" isHeaderSticky>
            <TableHeader>
              <TableColumn>SYMBOL</TableColumn>
              <TableColumn>NAME</TableColumn>
              <TableColumn>ISIN</TableColumn>
              <TableColumn>BSE CODE</TableColumn>
              <TableColumn>FACE VALUE</TableColumn>
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
                    {stock.Symbol || "-"}
                  </TableCell>
                  <TableCell>{stock.Name || "-"}</TableCell>
                  <TableCell>{stock.Isin || "-"}</TableCell>
                  <TableCell>{stock.BseCode || "-"}</TableCell>
                  <TableCell>
                    {stock.FaceValue ? stock.FaceValue : "-"}
                  </TableCell>
                  <TableCell>
                    <Chip
                      color={stock.IsActive ? "warning" : "default"}
                      size="sm"
                      variant="flat"
                    >
                      {stock.IsActive ? "Staging" : "Inactive"}
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

                          {selectedStock.FaceValue && (
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

        {/* Add Stock Modal */}
        <Modal isOpen={isModalOpen} onClose={handleCloseModal} size="2xl">
          <ModalContent>
            <ModalHeader>Add Stock to Staging</ModalHeader>
            <ModalBody>
              <div className="grid grid-cols-1 gap-4">
                <Input
                  label="Symbol"
                  placeholder="Enter stock symbol"
                  value={formData.symbol}
                  onChange={(e) =>
                    setFormData({ ...formData, symbol: e.target.value })
                  }
                />
                <Input
                  label="ISIN"
                  placeholder="Enter ISIN"
                  value={formData.isin}
                  onChange={(e) =>
                    setFormData({ ...formData, isin: e.target.value })
                  }
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
                  label="Stock Name"
                  placeholder="Enter stock name (optional)"
                  value={formData.stockName}
                  onChange={(e) =>
                    setFormData({ ...formData, stockName: e.target.value })
                  }
                />
                <Autocomplete
                  label="Country"
                  placeholder="Search country (optional)"
                  selectedKey={formData.countryId}
                  onSelectionChange={(key) =>
                    setFormData({ ...formData, countryId: key as string })
                  }
                >
                  {countries.map((country) => (
                    <AutocompleteItem key={country.Id}>
                      {country.Name}
                    </AutocompleteItem>
                  ))}
                </Autocomplete>
                <StockTypeAutocomplete
                  name="investmentType"
                  label="Investment Type"
                  placeholder="Search investment type (optional)"
                  value={formData.investmentType}
                  onSelectionChange={(value) =>
                    setFormData({
                      ...formData,
                      investmentType: value?.toString() || "",
                    })
                  }
                  size="md"
                />
              </div>
              <p className="mt-2 text-sm text-default-500">
                * At least one of Symbol, ISIN, or BSE Code must be provided
              </p>
            </ModalBody>
            <ModalFooter>
              <Button variant="flat" onPress={handleCloseModal}>
                Cancel
              </Button>
              <Button color="primary" onPress={handleAddStock}>
                Add to Staging
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
            <ModalHeader>Edit Staging Stock</ModalHeader>
            <ModalBody>
              {editingStock && (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Input
                    label="Symbol"
                    placeholder="Enter stock symbol"
                    value={editingStock.Symbol || ""}
                    onChange={(e) =>
                      setEditingStock({
                        ...editingStock,
                        Symbol: e.target.value || null,
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
                    label="ISIN"
                    placeholder="Enter ISIN"
                    value={editingStock.Isin || ""}
                    onChange={(e) =>
                      setEditingStock({
                        ...editingStock,
                        Isin: e.target.value || null,
                      })
                    }
                  />
                  <Input
                    label="Face Value"
                    type="number"
                    placeholder="Enter face value"
                    value={editingStock.FaceValue?.toString() || ""}
                    onChange={(e) =>
                      setEditingStock({
                        ...editingStock,
                        FaceValue: parseFloat(e.target.value) || null,
                      })
                    }
                  />
                  <Autocomplete
                    label="Country"
                    placeholder="Search country"
                    selectedKey={editingStock.CountryId?.toString() || ""}
                    onSelectionChange={(key) =>
                      setEditingStock({
                        ...editingStock,
                        CountryId: key ? parseInt(key as string) : null,
                      })
                    }
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
                    value={editingStock.InvestmentTypeId || undefined}
                    onSelectionChange={(value) =>
                      setEditingStock({
                        ...editingStock,
                        InvestmentTypeId: value || null,
                      })
                    }
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
                        <span className="text-sm text-default-500">Symbol:</span>
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
                        <span className="text-sm text-default-500">BSE Code:</span>
                        <span className="font-semibold">
                          {migratingStock.BseCode || "N/A"}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-lg bg-warning-50 p-4">
                    <p className="text-sm text-warning-700">
                      <strong>Warning:</strong> This action will remove the stock
                      from staging and add it to the listed stocks directory. This
                      action cannot be undone.
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
