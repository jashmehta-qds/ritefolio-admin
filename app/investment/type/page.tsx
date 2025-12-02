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

interface InvestmentType {
  Id: number;
  InvestmentId: number;
  InvestmentCategory: string;
  ShortCode: string;
  Description: string;
  IsActive: boolean;
}

interface InvestmentSegment {
  Id: number;
  Category: string;
  IsActive: boolean;
}

interface TypeFormData {
  investmentSegmentId: string;
  shortCode: string;
  description: string;
  isActive: boolean;
}

// Validation Schema
const typeValidationSchema = Yup.object({
  investmentSegmentId: Yup.string().required("Investment segment is required"),
  shortCode: Yup.string()
    .required("Short code is required")
    .min(2, "Short code must be at least 2 characters")
    .max(20, "Short code must not exceed 20 characters"),
  description: Yup.string().max(
    500,
    "Description must not exceed 500 characters"
  ),
  isActive: Yup.boolean(),
});

export default function InvestmentTypePage() {
  const [types, setTypes] = useState<InvestmentType[]>([]);
  const [segments, setSegments] = useState<InvestmentSegment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<InvestmentType | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const formik = useFormik<TypeFormData>({
    initialValues: {
      investmentSegmentId: "",
      shortCode: "",
      description: "",
      isActive: true,
    },
    validationSchema: typeValidationSchema,
    onSubmit: async (values) => {
      try {
        const payload = {
          ...values,
          investmentSegmentId: parseInt(values.investmentSegmentId),
        };

        const response = selectedType
          ? await axiosInstance.put(`/investment/type/${selectedType.Id}`, payload)
          : await axiosInstance.post("/investment/type", payload);

        const result = response.data;

        if (result.success) {
          handleCloseModal();
          fetchTypes();
        } else {
          console.error("Failed to save investment type:", result.error);
          alert(`Error: ${result.message || result.error}`);
        }
      } catch (error) {
        console.error("Error saving investment type:", error);
        alert("Failed to save investment type");
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

      fetchTypes();
      fetchSegments();
    };

    checkAuth();
  }, [router, supabase.auth]);

  const fetchTypes = async () => {
    try {
      setIsLoading(true);
      const response = await axiosInstance.get("/investment/type");
      const result = response.data;

      if (result.success) {
        setTypes(result.data);
      } else {
        console.error("Failed to fetch investment types:", result.error);
      }
    } catch (error) {
      console.error("Error fetching investment types:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSegments = async () => {
    try {
      const response = await axiosInstance.get("/investment/segment");
      const result = response.data;

      if (result.success) {
        setSegments(result.data.filter((s: InvestmentSegment) => s.IsActive));
      } else {
        console.error("Failed to fetch investment segments:", result.error);
      }
    } catch (error) {
      console.error("Error fetching investment segments:", error);
    }
  };

  const handleOpenModal = (type?: InvestmentType) => {
    if (type) {
      setSelectedType(type);
      formik.setValues({
        investmentSegmentId: type.InvestmentId.toString(),
        shortCode: type.ShortCode,
        description: type.Description || "",
        isActive: type.IsActive,
      });
    } else {
      setSelectedType(null);
      formik.resetForm();
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedType(null);
    formik.resetForm();
  };

  const handleDelete = async () => {
    if (!selectedType) return;

    try {
      setIsDeleting(true);

      const response = await axiosInstance.delete(
        `/investment/type/${selectedType.Id}`
      );
      const result = response.data;

      if (result.success) {
        setIsDeleteModalOpen(false);
        setSelectedType(null);
        fetchTypes();
      } else {
        console.error("Failed to delete investment type:", result.error);
        alert(`Error: ${result.message || result.error}`);
      }
    } catch (error) {
      console.error("Error deleting investment type:", error);
      alert("Failed to delete investment type");
    } finally {
      setIsDeleting(false);
    }
  };

  const openDeleteModal = (type: InvestmentType) => {
    setSelectedType(type);
    setIsDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setSelectedType(null);
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
              Investment Type
            </h1>
            <p className="mt-2 text-default-500">
              Manage investment type master data
            </p>
          </div>
          <Button
            color="primary"
            startContent={<FiPlus className="text-lg" />}
            onPress={() => handleOpenModal()}
          >
            Add Type
          </Button>
        </div>

        {/* Type Table */}
        <Table
          aria-label="Investment type table"
          className="max-h-[70vh] overflow-auto"
          isHeaderSticky
        >
          <TableHeader>
            <TableColumn>ID</TableColumn>
            <TableColumn>SHORT CODE</TableColumn>
            <TableColumn>SEGMENT</TableColumn>
            <TableColumn>DESCRIPTION</TableColumn>
            <TableColumn>STATUS</TableColumn>
            <TableColumn>ACTIONS</TableColumn>
          </TableHeader>
          <TableBody>
            {types.map((type) => (
              <TableRow key={type.Id}>
                <TableCell>{type.Id}</TableCell>
                <TableCell>{type.ShortCode}</TableCell>
                <TableCell>{type.InvestmentCategory}</TableCell>
                <TableCell>{type.Description || "-"}</TableCell>
                <TableCell>
                  <Chip
                    color={type.IsActive ? "success" : "default"}
                    size="sm"
                    variant="flat"
                  >
                    {type.IsActive ? "Active" : "Inactive"}
                  </Chip>
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="light"
                      color="primary"
                      isIconOnly
                      onPress={() => handleOpenModal(type)}
                    >
                      <FiEdit2 />
                    </Button>
                    <Button
                      size="sm"
                      variant="light"
                      color="danger"
                      isIconOnly
                      onPress={() => openDeleteModal(type)}
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
                {selectedType ? "Edit Type" : "Add Type"}
              </ModalHeader>
              <ModalBody>
                <div className="space-y-4">
                  <Input
                    label="Short Code"
                    placeholder="Enter short code"
                    name="shortCode"
                    value={formik.values.shortCode}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    isInvalid={
                      formik.touched.shortCode && !!formik.errors.shortCode
                    }
                    errorMessage={
                      formik.touched.shortCode && formik.errors.shortCode
                    }
                    isRequired
                  />
                  <Autocomplete
                    label="Investment Segment"
                    placeholder="Search and select investment segment"
                    name="investmentSegmentId"
                    selectedKey={formik.values.investmentSegmentId || null}
                    inputValue={
                      formik.values.investmentSegmentId
                        ? (() => {
                            const selected = segments.find(
                              (s) =>
                                s.Id.toString() ===
                                formik.values.investmentSegmentId
                            );
                            return selected ? selected.Category : "";
                          })()
                        : ""
                    }
                    defaultItems={segments}
                    onSelectionChange={(key) => {
                      formik.setFieldValue("investmentSegmentId", key);
                    }}
                    onBlur={() =>
                      formik.setFieldTouched("investmentSegmentId", true)
                    }
                    isInvalid={
                      formik.touched.investmentSegmentId &&
                      !!formik.errors.investmentSegmentId
                    }
                    errorMessage={
                      formik.touched.investmentSegmentId &&
                      formik.errors.investmentSegmentId
                    }
                    isRequired
                  >
                    {(segment) => (
                      <AutocompleteItem
                        key={segment.Id.toString()}
                        textValue={segment.Category}
                      >
                        {segment.Category}
                      </AutocompleteItem>
                    )}
                  </Autocomplete>
                  <Input
                    label="Description"
                    placeholder="Enter description (optional)"
                    name="description"
                    value={formik.values.description}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    isInvalid={
                      formik.touched.description && !!formik.errors.description
                    }
                    errorMessage={
                      formik.touched.description && formik.errors.description
                    }
                  />
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
                  {selectedType ? "Update" : "Create"}
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
                Are you sure you want to delete the type{" "}
                <strong>{selectedType?.ShortCode}</strong>?
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
