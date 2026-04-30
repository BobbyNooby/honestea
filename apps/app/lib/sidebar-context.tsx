import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react"

interface SidebarApi {
  isOpen: boolean
  open: () => void
  close: () => void
  toggle: () => void
}

const SidebarContext = createContext<SidebarApi | null>(null)

export function SidebarProvider({
  render,
}: {
  render: (api: SidebarApi) => ReactNode
}) {
  const [isOpen, setOpen] = useState(false)
  const api = useMemo<SidebarApi>(
    () => ({
      isOpen,
      open: () => setOpen(true),
      close: () => setOpen(false),
      toggle: () => setOpen((prev) => !prev),
    }),
    [isOpen],
  )
  return (
    <SidebarContext.Provider value={api}>
      {render(api)}
    </SidebarContext.Provider>
  )
}

export function useSidebar(): SidebarApi {
  const ctx = useContext(SidebarContext)
  if (!ctx) {
    throw new Error("useSidebar must be used within <SidebarProvider>")
  }
  return ctx
}
