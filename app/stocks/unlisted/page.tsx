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
import { FiPlus, FiSearch } from "react-icons/fi";
import { createClient } from "@/lib/supabase/client";
import axiosInstance from "@/lib/axios";

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
  Name: string;
  ShortCode: string;
}

export default function UnlistedStocksPage() {
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [investmentTypes, setInvestmentTypes] = useState<InvestmentType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  // Form state
  const [formData, setFormData] = useState({
    countryId: "",
    investmentType: "",
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
        `/stocks/unlisted?${params.toString()}`
      );
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

  const handleAddStock = async () => {
    try {
      const response = await axiosInstance.post("/stocks/unlisted", formData);
      const result = response.data;

      if (result.success) {
        handleCloseModal();
        fetchStocks();
      } else {
        alert(`Error: ${result.message || result.error}`);
      }
    } catch (error) {
      console.error("Error adding unlisted stock:", error);
      alert("Failed to add stock. Please try again.");
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setFormData({
      countryId: "",
      investmentType: "",
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
              Unlisted Stocks
            </h1>
            <p className="mt-2 text-default-500">
              Manage unlisted stocks directory
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
          <Table
            aria-label="Unlisted stocks table"
            isHeaderSticky
          >
          <TableHeader>
            <TableColumn>SYMBOL</TableColumn>
            <TableColumn>NAME</TableColumn>
            <TableColumn>ISIN</TableColumn>
            <TableColumn>FACE VALUE</TableColumn>
            <TableColumn>SECTOR</TableColumn>
            <TableColumn>INDUSTRY</TableColumn>
            <TableColumn>STATUS</TableColumn>
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
                <TableCell>{stock.Name}</TableCell>
                <TableCell>{stock.Isin || "-"}</TableCell>
                <TableCell>{stock.FaceValue}</TableCell>
                <TableCell>{stock.Sector || "-"}</TableCell>
                <TableCell>{stock.Industry || "-"}</TableCell>
                <TableCell>
                  <Chip
                    color={stock.IsActive ? "success" : "default"}
                    size="sm"
                    variant="flat"
                  >
                    {stock.IsActive ? "Active" : "Inactive"}
                  </Chip>
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

        {/* Add Stock Modal */}
        <Modal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          size="3xl"
          scrollBehavior="inside"
        >
          <ModalContent>
            <ModalHeader>Add New Unlisted Stock</ModalHeader>
            <ModalBody>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Input
                  label="Symbol"
                  placeholder="Enter stock symbol"
                  value={formData.symbol}
                  onChange={(e) =>
                    setFormData({ ...formData, symbol: e.target.value })
                  }
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
                  label="ISIN"
                  placeholder="Enter ISIN"
                  value={formData.isin}
                  onChange={(e) =>
                    setFormData({ ...formData, isin: e.target.value })
                  }
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
                <Select
                  label="Investment Type *"
                  placeholder="Select investment type"
                  selectedKeys={
                    formData.investmentType ? [formData.investmentType] : []
                  }
                  onChange={(e) =>
                    setFormData({ ...formData, investmentType: e.target.value })
                  }
                  required
                >
                  {investmentTypes.map((type) => (
                    <SelectItem key={type.ShortCode}>
                      {type.Name}
                    </SelectItem>
                  ))}
                </Select>
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
              <p className="mt-2 text-sm text-default-500">
                * At least one of ISIN or Symbol must be provided
              </p>
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
      </div>
    </div>
  );
}
