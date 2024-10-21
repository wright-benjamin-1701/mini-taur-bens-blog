import {
    Container,
    Heading,
    SkeletonText,
    Table,
    TableContainer,
    Tbody,
    Td,
    Th,
    Thead,
    Tr,
  } from "@chakra-ui/react"
  import { useQuery, useQueryClient } from "@tanstack/react-query"
  import { createFileRoute, useNavigate } from "@tanstack/react-router"
  import { useEffect } from "react"
  import { z } from "zod"
  
  import { SitesService } from "../../client"
  import ActionsMenu from "../../components/Common/ActionsMenu"
  import Navbar from "../../components/Common/Navbar"
  import AddSite from "../../components/Sites/AddSite"

  import { PaginationFooter } from "../../components/Common/PaginationFooter.tsx"
  
const siteSearchSchema = z.object({
    page: z.number().catch(1),
  })
  
  export const Route = createFileRoute("/_layout/sites")({
  component: Sites,
  validateSearch: (search) => siteSearchSchema.parse(search),
  })
  
  const PER_PAGE = 5
  
function getSitesQueryOptions({ page }: { page: number }) {
    return {
      queryFn: () =>
        SitesService.readSites({ skip: (page - 1) * PER_PAGE, limit: PER_PAGE }),
    queryKey: ["sites", { page }],
    }
  }

  function parseISOString(s:string) {
    let b = s.split(/\D+/) as unknown as number[];
    return new Date(Date.UTC(b[0], b[1], b[2], b[3], b[4], b[5], b[6]));
  }

function DateFromIso(isoDate:string|null|undefined) {
  if(isoDate==null || isoDate==undefined){
    return null;
  }
  const dateObj = parseISOString(isoDate) as Date;
  return (
    <>
    {dateObj.getUTCMonth() + '/' + dateObj.getUTCDate() + '/'  + dateObj.getUTCFullYear()}
    </>

  )
}

function SitesTable() {
    const queryClient = useQueryClient()
    const { page } = Route.useSearch()
    const navigate = useNavigate({ from: Route.fullPath })
    const setPage = (page: number) =>
      navigate({ search: (prev) => ({ ...prev, page }) })
  
    const {
    data: sites,
      isPending,
      isPlaceholderData,
    } = useQuery({
    ...getSitesQueryOptions({ page }),
      placeholderData: (prevData) => prevData,
    })
  
  const hasNextPage = !isPlaceholderData && sites?.data.length === PER_PAGE
    const hasPreviousPage = page > 1
  
    useEffect(() => {
      if (hasNextPage) {
      queryClient.prefetchQuery(getSitesQueryOptions({ page: page + 1 }))
      }
    }, [page, queryClient, hasNextPage])

    useEffect(()=>{

      SitesService.updateSites();

    },[sites])

    
  
    return (
      <>
        <TableContainer>
          <Table size={{ base: "sm", md: "md" }}>
            <Thead>
              <Tr>
                
                <Th>Name</Th>
                <Th>Last Updated</Th>
                <Th>Link</Th>
                <Th>Actions</Th>
              </Tr>
            </Thead>
            {isPending ? (
              <Tbody>
                <Tr>
                  {new Array(4).fill(null).map((_, index) => (
                  <Td key={index} paddingBlock="16px">
                    <SkeletonText noOfLines={1} />
                    </Td>
                  ))}
                </Tr>
              </Tbody>
            ) : (
              <Tbody>
              {sites?.data.map((site) => (
                <Tr key={site.id} opacity={isPlaceholderData ? 0.5 : 1}>
                  
                    <Td isTruncated maxWidth="150px">
                    {site.name}
                    </Td>

                    <Td>{DateFromIso(site.updated)}</Td>
                    <Td><u><a href={site.url} target="_blank">{site.url}</a></u></Td>
                    <Td>
                    <ActionsMenu type={"Site"} value={site} />
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            )}
          </Table>
        </TableContainer>
        <PaginationFooter
          page={page}
          onChangePage={setPage}
          hasNextPage={hasNextPage}
          hasPreviousPage={hasPreviousPage}
        />
      </>
    )
  }
  
function Sites() {
    return (
      <Container maxW="full">
        <Heading size="lg" textAlign={{ base: "center", md: "left" }} pt={12}>
        Site Management
        </Heading>
  
      <Navbar type={"Site"} addModalAs={AddSite} />
      <SitesTable />
      </Container>
    )
  }
