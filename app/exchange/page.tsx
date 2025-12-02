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
import { Autocomplete, AutocompleteItem } from "@heroui/autocomplete";
import { FiPlus, FiEdit2, FiTrash2 } from "react-icons/fi";
import { createClient } from "@/lib/supabase/client";
import { useFormik } from "formik";
import * as Yup from "yup";
import axiosInstance from "@/lib/axios";

interface Exchange {
  Id: number;
  CountryId: number;
  CountryName: string;
  ExchangeCode: string;
  Name: string;
  BloombergCode: string;
  IsoMic: string;
  EodCode: string;
  Description: string;
  IsActive: boolean;
}

interface Country {
  Id: number;
  Name: string;
  IsoCode: string;
  IsActive: boolean;
}

interface ExchangeFormData {
  countryId: string;
  exchangeCode: string;
  name: string;
  isoMic: string;
  description: string;
  bloombergCode: string;
  eodCode: string;
  isActive: boolean;
}

// Validation Schema
const exchangeValidationSchema = Yup.object({
  countryId: Yup.string().required("Country is required"),
  exchangeCode: Yup.string()
    .required("Exchange code is required")
    .min(2, "Exchange code must be at least 2 characters")
    .max(10, "Exchange code must not exceed 10 characters")
    .matches(
      /^[A-Z0-9]+$/,
      "Exchange code must contain only uppercase letters and numbers"
    ),
  name: Yup.string()
    .required("Exchange name is required")
    .min(2, "Name must be at least 2 characters")
    .max(200, "Name must not exceed 200 characters"),
  isoMic: Yup.string()
    .required("ISO MIC is required")
    .length(4, "ISO MIC must be exactly 4 characters")
    .matches(/^[A-Z]{4}$/, "ISO MIC must contain only uppercase letters"),
  description: Yup.string().max(
    500,
    "Description must not exceed 500 characters"
  ),
  bloombergCode: Yup.string().max(
    10,
    "Bloomberg code must not exceed 10 characters"
  ),
  eodCode: Yup.string().max(10, "EOD code must not exceed 10 characters"),
  isActive: Yup.boolean(),
});

export default function ExchangePage() {
  const [exchanges, setExchanges] = useState<Exchange[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedExchange, setSelectedExchange] = useState<Exchange | null>(
    null
  );
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const formik = useFormik<ExchangeFormData>({
    initialValues: {
      countryId: "",
      exchangeCode: "",
      name: "",
      isoMic: "",
      description: "",
      bloombergCode: "",
      eodCode: "",
      isActive: true,
    },
    validationSchema: exchangeValidationSchema,
    onSubmit: async (values) => {
      try {
        const payload = {
          ...values,
          countryId: parseInt(values.countryId),
        };

        const response = selectedExchange
          ? await axiosInstance.put(`/exchange/${selectedExchange.Id}`, payload)
          : await axiosInstance.post("/exchange", payload);

        const result = response.data;

        if (result.success) {
          handleCloseModal();
          fetchExchanges();
        } else {
          console.error("Failed to save exchange:", result.error);
          alert(`Error: ${result.message || result.error}`);
        }
      } catch (error) {
        console.error("Error saving exchange:", error);
        alert("Failed to save exchange");
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

      fetchExchanges();
      fetchCountries();
    };

    checkAuth();
  }, [router, supabase.auth]);

  const fetchExchanges = async () => {
    try {
      setIsLoading(true);
      const response = await axiosInstance.get("/exchange");
      const result = response.data;

      if (result.success) {
        setExchanges(result.data);
      } else {
        console.error("Failed to fetch exchanges:", result.error);
      }
    } catch (error) {
      console.error("Error fetching exchanges:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCountries = async () => {
    try {
      const response = await axiosInstance.get("/country");
      const result = response.data;

      if (result.success) {
        setCountries(result.data.filter((c: Country) => c.IsActive));
      } else {
        console.error("Failed to fetch countries:", result.error);
      }
    } catch (error) {
      console.error("Error fetching countries:", error);
    }
  };

  const handleOpenModal = (exchange?: Exchange) => {
    if (exchange) {
      setSelectedExchange(exchange);
      formik.setValues({
        countryId: exchange.CountryId.toString(),
        exchangeCode: exchange.ExchangeCode,
        name: exchange.Name,
        isoMic: exchange.IsoMic,
        description: exchange.Description || "",
        bloombergCode: exchange.BloombergCode || "",
        eodCode: exchange.EodCode || "",
        isActive: exchange.IsActive,
      });
    } else {
      setSelectedExchange(null);
      formik.resetForm();
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedExchange(null);
    formik.resetForm();
  };

  const handleDelete = async () => {
    if (!selectedExchange) return;

    try {
      setIsDeleting(true);

      const response = await axiosInstance.delete(
        `/exchange/${selectedExchange.Id}`
      );
      const result = response.data;

      if (result.success) {
        setIsDeleteModalOpen(false);
        setSelectedExchange(null);
        fetchExchanges();
      } else {
        console.error("Failed to delete exchange:", result.error);
        alert(`Error: ${result.message || result.error}`);
      }
    } catch (error) {
      console.error("Error deleting exchange:", error);
      alert("Failed to delete exchange");
    } finally {
      setIsDeleting(false);
    }
  };

  const openDeleteModal = (exchange: Exchange) => {
    setSelectedExchange(exchange);
    setIsDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setSelectedExchange(null);
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
              Stock Exchange
            </h1>
            <p className="mt-2 text-default-500">
              Manage stock exchange master data
            </p>
          </div>
          <Button
            color="primary"
            startContent={<FiPlus className="text-lg" />}
            onPress={() => handleOpenModal()}
          >
            Add Exchange
          </Button>
        </div>

        {/* Exchange Table */}
        <Table
          aria-label="Exchange table"
          className="max-h-[70vh] overflow-auto"
          isHeaderSticky
        >
          <TableHeader>
            <TableColumn>ID</TableColumn>
            <TableColumn>NAME</TableColumn>
            <TableColumn>EXCHANGE CODE</TableColumn>
            <TableColumn>ISO MIC</TableColumn>
            <TableColumn>COUNTRY</TableColumn>
            <TableColumn>BLOOMBERG</TableColumn>
            <TableColumn>EOD CODE</TableColumn>
            <TableColumn>STATUS</TableColumn>
            <TableColumn>ACTIONS</TableColumn>
          </TableHeader>
          <TableBody>
            {exchanges.map((exchange) => (
              <TableRow key={exchange.Id}>
                <TableCell>{exchange.Id}</TableCell>
                <TableCell>{exchange.Name}</TableCell>
                <TableCell>{exchange.ExchangeCode}</TableCell>
                <TableCell>{exchange.IsoMic}</TableCell>
                <TableCell>{exchange.CountryName}</TableCell>
                <TableCell>{exchange.BloombergCode || "-"}</TableCell>
                <TableCell>{exchange.EodCode || "-"}</TableCell>
                <TableCell>
                  <Chip
                    color={exchange.IsActive ? "success" : "default"}
                    size="sm"
                    variant="flat"
                  >
                    {exchange.IsActive ? "Active" : "Inactive"}
                  </Chip>
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="light"
                      color="primary"
                      isIconOnly
                      onPress={() => handleOpenModal(exchange)}
                    >
                      <FiEdit2 />
                    </Button>
                    <Button
                      size="sm"
                      variant="light"
                      color="danger"
                      isIconOnly
                      onPress={() => openDeleteModal(exchange)}
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
                {selectedExchange ? "Edit Exchange" : "Add Exchange"}
              </ModalHeader>
              <ModalBody>
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Exchange Name"
                    placeholder="Enter exchange name"
                    name="name"
                    value={formik.values.name}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    isInvalid={formik.touched.name && !!formik.errors.name}
                    errorMessage={formik.touched.name && formik.errors.name}
                    isRequired
                  />
                  <Input
                    label="Exchange Code"
                    placeholder="Enter exchange code (e.g., NSE, BSE)"
                    name="exchangeCode"
                    value={formik.values.exchangeCode}
                    onChange={(e) => {
                      formik.setFieldValue(
                        "exchangeCode",
                        e.target.value.toUpperCase()
                      );
                    }}
                    onBlur={formik.handleBlur}
                    isInvalid={
                      formik.touched.exchangeCode &&
                      !!formik.errors.exchangeCode
                    }
                    errorMessage={
                      formik.touched.exchangeCode && formik.errors.exchangeCode
                    }
                    isRequired
                  />
                  <Input
                    label="ISO MIC"
                    placeholder="Enter ISO MIC (4 letters)"
                    name="isoMic"
                    value={formik.values.isoMic}
                    onChange={(e) => {
                      formik.setFieldValue(
                        "isoMic",
                        e.target.value.toUpperCase()
                      );
                    }}
                    onBlur={formik.handleBlur}
                    maxLength={4}
                    isInvalid={formik.touched.isoMic && !!formik.errors.isoMic}
                    errorMessage={formik.touched.isoMic && formik.errors.isoMic}
                    isRequired
                  />
                  <Autocomplete
                    label="Country"
                    placeholder="Search and select country"
                    name="countryId"
                    selectedKey={formik.values.countryId || null}
                    inputValue={
                      formik.values.countryId
                        ? (() => {
                            const selected = countries.find(
                              (c) => c.Id.toString() === formik.values.countryId
                            );
                            return selected ? selected.Name : "";
                          })()
                        : ""
                    }
                    defaultItems={countries}
                    onSelectionChange={(key) => {
                      formik.setFieldValue("countryId", key);
                    }}
                    onBlur={() => formik.setFieldTouched("countryId", true)}
                    isInvalid={
                      formik.touched.countryId && !!formik.errors.countryId
                    }
                    errorMessage={
                      formik.touched.countryId && formik.errors.countryId
                    }
                    isRequired
                  >
                    {(country) => (
                      <AutocompleteItem
                        key={country.Id.toString()}
                        textValue={country.Name}
                      >
                        {country.Name}
                      </AutocompleteItem>
                    )}
                  </Autocomplete>
                  <Input
                    label="Bloomberg Code"
                    placeholder="Enter Bloomberg code (optional)"
                    name="bloombergCode"
                    value={formik.values.bloombergCode}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    isInvalid={
                      formik.touched.bloombergCode &&
                      !!formik.errors.bloombergCode
                    }
                    errorMessage={
                      formik.touched.bloombergCode &&
                      formik.errors.bloombergCode
                    }
                  />
                  <Input
                    label="EOD Code"
                    placeholder="Enter EOD code (optional)"
                    name="eodCode"
                    value={formik.values.eodCode}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    isInvalid={
                      formik.touched.eodCode && !!formik.errors.eodCode
                    }
                    errorMessage={
                      formik.touched.eodCode && formik.errors.eodCode
                    }
                  />
                  <div className="col-span-2">
                    <Input
                      label="Description"
                      placeholder="Enter exchange description (optional)"
                      name="description"
                      value={formik.values.description}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      isInvalid={
                        formik.touched.description &&
                        !!formik.errors.description
                      }
                      errorMessage={
                        formik.touched.description && formik.errors.description
                      }
                    />
                  </div>
                  <div className="col-span-2">
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
                  {selectedExchange ? "Update" : "Create"}
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
                Are you sure you want to delete the exchange{" "}
                <strong>{selectedExchange?.Name}</strong>?
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
