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
import { FiPlus, FiSearch, FiEye, FiCopy, FiCheck } from "react-icons/fi";
import { createClient } from "@/lib/supabase/client";
import axiosInstance from "@/lib/axios";

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
  IsActive: boolean;
  CreatedOn?: number;
}

interface Country {
  Id: number;
  Name: string;
  Code: string;
}

export default function StagingStocksPage() {
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedStock, setSelectedStock] = useState<Stock | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  // Form state
  const [formData, setFormData] = useState({
    symbol: "",
    isin: "",
    bseCode: "",
    stockName: "",
    countryId: "",
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

      if (search.trim()) {
        params.append("stockName", search);
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
        handleCloseModal();
        fetchStocks();
      } else {
        alert(`Error: ${result.message || result.error}`);
      }
    } catch (error) {
      console.error("Error adding staging stock:", error);
      alert("Failed to add stock. Please try again.");
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
      </div>
    </div>
  );
}
