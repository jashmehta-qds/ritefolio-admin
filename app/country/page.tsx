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

interface Country {
  Id: number;
  Name: string;
  IsoCode: string;
  CurrencyName: string;
  CurrencyCode: string;
  CurrencySymbol: string;
  CountryCode: number;
  IsActive: boolean;
}

interface Currency {
  Id: number;
  Name: string;
  CurrencyCode: string;
  CurrencySymbol: string;
  IsActive: boolean;
}

interface CountryFormData {
  name: string;
  isoCode: string;
  currencyCode: string;
  countryCode: string;
  isActive: boolean;
}

// Validation Schema
const countryValidationSchema = Yup.object({
  name: Yup.string()
    .required("Country name is required")
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must not exceed 100 characters"),
  isoCode: Yup.string()
    .required("ISO code is required")
    .length(2, "ISO code must be exactly 2 characters")
    .matches(/^[A-Z]{2}$/, "ISO code must contain only uppercase letters"),
  currencyCode: Yup.string().required("Currency is required"),
  countryCode: Yup.string()
    .required("Country code is required")
    .matches(/^[0-9]+$/, "Country code must contain only numbers")
    .min(1, "Country code must be at least 1 digit")
    .max(4, "Country code must not exceed 4 digits"),
  isActive: Yup.boolean(),
});

export default function CountryPage() {
  const [countries, setCountries] = useState<Country[]>([]);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const formik = useFormik<CountryFormData>({
    initialValues: {
      name: "",
      isoCode: "",
      currencyCode: "",
      countryCode: "",
      isActive: true,
    },
    validationSchema: countryValidationSchema,
    onSubmit: async (values) => {
      try {
        const payload = {
          ...values,
          countryCode: parseInt(values.countryCode),
        };

        const response = selectedCountry
          ? await axiosInstance.put(`/country/${selectedCountry.Id}`, payload)
          : await axiosInstance.post("/country", payload);

        const result = response.data;

        if (result.success) {
          handleCloseModal();
          fetchCountries();
        } else {
          console.error("Failed to save country:", result.error);
          alert(`Error: ${result.message || result.error}`);
        }
      } catch (error) {
        console.error("Error saving country:", error);
        alert("Failed to save country");
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

      fetchCountries();
      fetchCurrencies();
    };

    checkAuth();
  }, [router, supabase.auth]);

  const fetchCountries = async () => {
    try {
      setIsLoading(true);
      const response = await axiosInstance.get("/country");
      const result = response.data;

      if (result.success) {
        setCountries(result.data);
      } else {
        console.error("Failed to fetch countries:", result.error);
      }
    } catch (error) {
      console.error("Error fetching countries:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCurrencies = async () => {
    try {
      const response = await axiosInstance.get("/currency");
      const result = response.data;

      if (result.success) {
        setCurrencies(result.data.filter((c: Currency) => c.IsActive));
      } else {
        console.error("Failed to fetch currencies:", result.error);
      }
    } catch (error) {
      console.error("Error fetching currencies:", error);
    }
  };

  const handleOpenModal = (country?: Country) => {
    if (country) {
      setSelectedCountry(country);
      formik.setValues({
        name: country.Name,
        isoCode: country.IsoCode,
        currencyCode: country.CurrencyCode,
        countryCode: country.CountryCode.toString(),
        isActive: country.IsActive,
      });
    } else {
      setSelectedCountry(null);
      formik.resetForm();
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedCountry(null);
    formik.resetForm();
  };

  const handleDelete = async () => {
    if (!selectedCountry) return;

    try {
      setIsDeleting(true);

      const response = await axiosInstance.delete(
        `/country/${selectedCountry.Id}`
      );
      const result = response.data;

      if (result.success) {
        setIsDeleteModalOpen(false);
        setSelectedCountry(null);
        fetchCountries();
      } else {
        console.error("Failed to delete country:", result.error);
        alert(`Error: ${result.message || result.error}`);
      }
    } catch (error) {
      console.error("Error deleting country:", error);
      alert("Failed to delete country");
    } finally {
      setIsDeleting(false);
    }
  };

  const openDeleteModal = (country: Country) => {
    setSelectedCountry(country);
    setIsDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setSelectedCountry(null);
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
            <h1 className="text-4xl font-bold text-foreground">Country</h1>
            <p className="mt-2 text-default-500">Manage country master data</p>
          </div>
          <Button
            color="primary"
            startContent={<FiPlus className="text-lg" />}
            onPress={() => handleOpenModal()}
          >
            Add Country
          </Button>
        </div>

        {/* Country Table */}
        <Table
          aria-label="Country table"
          className="max-h-[70vh] overflow-auto"
          isHeaderSticky
        >
          <TableHeader>
            <TableColumn>ID</TableColumn>
            <TableColumn>NAME</TableColumn>
            <TableColumn>ISO CODE</TableColumn>
            <TableColumn>COUNTRY CODE</TableColumn>
            <TableColumn>CURRENCY</TableColumn>
            <TableColumn>STATUS</TableColumn>
            <TableColumn>ACTIONS</TableColumn>
          </TableHeader>
          <TableBody>
            {countries.map((country) => (
              <TableRow key={country.Id}>
                <TableCell>{country.Id}</TableCell>
                <TableCell>{country.Name}</TableCell>
                <TableCell>{country.IsoCode}</TableCell>
                <TableCell>{country.CountryCode}</TableCell>
                <TableCell>
                  {country.CurrencyCode} ({country.CurrencySymbol})
                </TableCell>
                <TableCell>
                  <Chip
                    color={country.IsActive ? "success" : "default"}
                    size="sm"
                    variant="flat"
                  >
                    {country.IsActive ? "Active" : "Inactive"}
                  </Chip>
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="light"
                      color="primary"
                      isIconOnly
                      onPress={() => handleOpenModal(country)}
                    >
                      <FiEdit2 />
                    </Button>
                    <Button
                      size="sm"
                      variant="light"
                      color="danger"
                      isIconOnly
                      onPress={() => openDeleteModal(country)}
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
        <Modal isOpen={isModalOpen} onClose={handleCloseModal} size="2xl">
          <ModalContent>
            <form onSubmit={formik.handleSubmit}>
              <ModalHeader>
                {selectedCountry ? "Edit Country" : "Add Country"}
              </ModalHeader>
              <ModalBody>
                <div className="space-y-4">
                  <Input
                    label="Name"
                    placeholder="Enter country name"
                    name="name"
                    value={formik.values.name}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    isInvalid={formik.touched.name && !!formik.errors.name}
                    errorMessage={formik.touched.name && formik.errors.name}
                    isRequired
                  />
                  <Input
                    label="ISO Code"
                    placeholder="Enter ISO code (e.g., IN, US)"
                    name="isoCode"
                    value={formik.values.isoCode}
                    onChange={(e) => {
                      formik.setFieldValue(
                        "isoCode",
                        e.target.value.toUpperCase()
                      );
                    }}
                    onBlur={formik.handleBlur}
                    maxLength={2}
                    isInvalid={
                      formik.touched.isoCode && !!formik.errors.isoCode
                    }
                    errorMessage={
                      formik.touched.isoCode && formik.errors.isoCode
                    }
                    isRequired
                  />
                  <Input
                    label="Country Code"
                    placeholder="Enter country code (e.g., 91, 1)"
                    name="countryCode"
                    value={formik.values.countryCode}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    isInvalid={
                      formik.touched.countryCode && !!formik.errors.countryCode
                    }
                    errorMessage={
                      formik.touched.countryCode && formik.errors.countryCode
                    }
                    isRequired
                  />
                  <Autocomplete
                    label="Currency"
                    placeholder="Search and select currency"
                    name="currencyCode"
                    selectedKey={formik.values.currencyCode || null}
                    inputValue={
                      formik.values.currencyCode
                        ? (() => {
                            const selected = currencies.find(
                              (c) =>
                                c.CurrencyCode === formik.values.currencyCode
                            );
                            return selected
                              ? `${selected.Name} (${selected.CurrencyCode} - ${selected.CurrencySymbol})`
                              : "";
                          })()
                        : ""
                    }
                    defaultItems={currencies}
                    onSelectionChange={(key) => {
                      formik.setFieldValue("currencyCode", key);
                    }}
                    onBlur={() => formik.setFieldTouched("currencyCode", true)}
                    isInvalid={
                      formik.touched.currencyCode &&
                      !!formik.errors.currencyCode
                    }
                    errorMessage={
                      formik.touched.currencyCode && formik.errors.currencyCode
                    }
                    isRequired
                  >
                    {(currency) => (
                      <AutocompleteItem
                        key={currency.CurrencyCode}
                        textValue={currency.CurrencyCode}
                      >
                        {currency.Name} ({currency.CurrencyCode} -{" "}
                        {currency.CurrencySymbol})
                      </AutocompleteItem>
                    )}
                  </Autocomplete>
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
                  {selectedCountry ? "Update" : "Create"}
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
                Are you sure you want to delete the country{" "}
                <strong>{selectedCountry?.Name}</strong>?
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
