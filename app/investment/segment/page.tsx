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
import { FiPlus, FiEdit2, FiTrash2 } from "react-icons/fi";
import { createClient } from "@/lib/supabase/client";
import { useFormik } from "formik";
import * as Yup from "yup";
import axiosInstance from "@/lib/axios";

interface InvestmentSegment {
  Id: number;
  Category: string;
  Description: string;
  IsActive: boolean;
}

interface SegmentFormData {
  category: string;
  description: string;
  isActive: boolean;
}

// Validation Schema
const segmentValidationSchema = Yup.object({
  category: Yup.string()
    .required("Category is required")
    .min(2, "Category must be at least 2 characters")
    .max(100, "Category must not exceed 100 characters"),
  description: Yup.string().max(
    500,
    "Description must not exceed 500 characters"
  ),
  isActive: Yup.boolean(),
});

export default function InvestmentSegmentPage() {
  const [segments, setSegments] = useState<InvestmentSegment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedSegment, setSelectedSegment] =
    useState<InvestmentSegment | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const formik = useFormik<SegmentFormData>({
    initialValues: {
      category: "",
      description: "",
      isActive: true,
    },
    validationSchema: segmentValidationSchema,
    onSubmit: async (values) => {
      try {
        const response = selectedSegment
          ? await axiosInstance.put(
              `/investment/segment/${selectedSegment.Id}`,
              values
            )
          : await axiosInstance.post("/investment/segment", values);

        const result = response.data;

        if (result.success) {
          handleCloseModal();
          fetchSegments();
        } else {
          console.error("Failed to save investment segment:", result.error);
          alert(`Error: ${result.message || result.error}`);
        }
      } catch (error) {
        console.error("Error saving investment segment:", error);
        alert("Failed to save investment segment");
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

      fetchSegments();
    };

    checkAuth();
  }, [router, supabase.auth]);

  const fetchSegments = async () => {
    try {
      setIsLoading(true);
      const response = await axiosInstance.get("/investment/segment");
      const result = response.data;

      if (result.success) {
        setSegments(result.data);
      } else {
        console.error("Failed to fetch investment segments:", result.error);
      }
    } catch (error) {
      console.error("Error fetching investment segments:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenModal = (segment?: InvestmentSegment) => {
    if (segment) {
      setSelectedSegment(segment);
      formik.setValues({
        category: segment.Category,
        description: segment.Description || "",
        isActive: segment.IsActive,
      });
    } else {
      setSelectedSegment(null);
      formik.resetForm();
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedSegment(null);
    formik.resetForm();
  };

  const handleDelete = async () => {
    if (!selectedSegment) return;

    try {
      setIsDeleting(true);

      const response = await axiosInstance.delete(
        `/investment/segment/${selectedSegment.Id}`
      );
      const result = response.data;

      if (result.success) {
        setIsDeleteModalOpen(false);
        setSelectedSegment(null);
        fetchSegments();
      } else {
        console.error("Failed to delete investment segment:", result.error);
        alert(`Error: ${result.message || result.error}`);
      }
    } catch (error) {
      console.error("Error deleting investment segment:", error);
      alert("Failed to delete investment segment");
    } finally {
      setIsDeleting(false);
    }
  };

  const openDeleteModal = (segment: InvestmentSegment) => {
    setSelectedSegment(segment);
    setIsDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setSelectedSegment(null);
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
              Investment Segment
            </h1>
            <p className="mt-2 text-default-500">
              Manage investment segment master data
            </p>
          </div>
          <Button
            color="primary"
            startContent={<FiPlus className="text-lg" />}
            onPress={() => handleOpenModal()}
          >
            Add Segment
          </Button>
        </div>

        {/* Segment Table */}
        <Table
          aria-label="Investment segment table"
          className="max-h-[70vh] overflow-auto"
          isHeaderSticky
        >
          <TableHeader>
            <TableColumn>ID</TableColumn>
            <TableColumn>CATEGORY</TableColumn>
            <TableColumn>DESCRIPTION</TableColumn>
            <TableColumn>STATUS</TableColumn>
            <TableColumn>ACTIONS</TableColumn>
          </TableHeader>
          <TableBody>
            {segments.map((segment) => (
              <TableRow key={segment.Id}>
                <TableCell>{segment.Id}</TableCell>
                <TableCell>{segment.Category}</TableCell>
                <TableCell>{segment.Description || "-"}</TableCell>
                <TableCell>
                  <Chip
                    color={segment.IsActive ? "success" : "default"}
                    size="sm"
                    variant="flat"
                  >
                    {segment.IsActive ? "Active" : "Inactive"}
                  </Chip>
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="light"
                      color="primary"
                      isIconOnly
                      onPress={() => handleOpenModal(segment)}
                    >
                      <FiEdit2 />
                    </Button>
                    <Button
                      size="sm"
                      variant="light"
                      color="danger"
                      isIconOnly
                      onPress={() => openDeleteModal(segment)}
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
                {selectedSegment ? "Edit Segment" : "Add Segment"}
              </ModalHeader>
              <ModalBody>
                <div className="space-y-4">
                  <Input
                    label="Category"
                    placeholder="Enter category name"
                    name="category"
                    value={formik.values.category}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    isInvalid={
                      formik.touched.category && !!formik.errors.category
                    }
                    errorMessage={
                      formik.touched.category && formik.errors.category
                    }
                    isRequired
                  />
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
                  {selectedSegment ? "Update" : "Create"}
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
                Are you sure you want to delete the segment{" "}
                <strong>{selectedSegment?.Category}</strong>?
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
