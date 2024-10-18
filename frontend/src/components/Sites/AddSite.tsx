import {
  Button,
  FormControl,
  FormErrorMessage,
  FormLabel,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
} from "@chakra-ui/react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { type SubmitHandler, useForm } from "react-hook-form"

import { type ApiError, type SiteCreate, SitesService } from "../../client"
import useCustomToast from "../../hooks/useCustomToast"
import { handleError } from "../../utils"

interface AddSiteProps {
  isOpen: boolean
  onClose: () => void
}

const AddSite = ({ isOpen, onClose }: AddSiteProps) => {
  const queryClient = useQueryClient()
  const showToast = useCustomToast()
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<SiteCreate>({
    mode: "onBlur",
    criteriaMode: "all",
    defaultValues: {
      url: "",
      name: ""
    },
  })

  const mutation = useMutation({
    mutationFn: (data: SiteCreate) => SitesService.createSite({ requestBody: data }),
    onSuccess: () => {
      showToast("Success!", "Site created successfully.", "success")
      reset()
      onClose()
    },
    onError: (err: ApiError) => {
      handleError(err, showToast)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["sites"] })
    },
  })

  const onSubmit: SubmitHandler<SiteCreate> = (data) => {
    mutation.mutate(data)
  }

  return (
    <>
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size={{ base: "sm", md: "md" }}
      isCentered
    >
      <ModalOverlay />
      <ModalContent as="form" onSubmit={handleSubmit(onSubmit)}>
        <ModalHeader>Add Site</ModalHeader>
        <ModalCloseButton />
        <ModalBody pb={6}>

        <FormControl isRequired isInvalid={!!errors.name}>
              <FormLabel htmlFor="name">Name</FormLabel>
              <Input
                id="name"
                {...register("name", {
                  required: "Name is required.",
                })}
                placeholder="Name"
                type="text"
              />
              {errors.name && (
                <FormErrorMessage>{errors.name.message}</FormErrorMessage>
              )}
            </FormControl>
          <FormControl isRequired isInvalid={!!errors.url}>
            <FormLabel htmlFor="url">URL</FormLabel>
            <Input
              id="url"
              {...register("url", {
                required: "URL is required.",
              })}
              placeholder="URL"
              type="text"
            />
            {errors.url && (
              <FormErrorMessage>{errors.url.message}</FormErrorMessage>
            )}
          </FormControl>
          
        </ModalBody>

        <ModalFooter gap={3}>
          <Button variant="primary" type="submit" isLoading={isSubmitting}>
            Save
          </Button>
          <Button onClick={onClose}>Cancel</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  </>);
}
export default AddSite;
