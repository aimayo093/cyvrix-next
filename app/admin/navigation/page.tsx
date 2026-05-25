import * as React from "react";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  createMenu,
  updateMenu,
  deleteMenu,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
  reorderMenuItems,
} from "@/lib/admin-actions";
import { Button } from "@/components/shared/Button";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { Plus, Pencil, Layers, ExternalLink, ArrowUp, ArrowDown, FolderTree } from "lucide-react";

export const metadata = { title: "Navigation CMS | CYVRIX Admin" };
export const dynamic = "force-dynamic";

export default async function NavigationCMSPage({
  searchParams,
}: {
  searchParams: Promise<{
    menuId?: string;
    editMenu?: string;
    editItem?: string;
    newItem?: string;
    newMenu?: string;
  }>;
}) {
  await requireAdmin();
  const sp = await searchParams;

  // Fetch all menus & pages
  const menus = await prisma.menu.findMany({
    orderBy: { name: "asc" },
  });

  const pages = await prisma.cmsPage.findMany({
    orderBy: { title: "asc" },
    select: { id: true, title: true, slug: true },
  });

  // Selected menu context
  const selectedMenuId = sp.menuId || menus[0]?.id || "";
  const selectedMenu = menus.find((m) => m.id === selectedMenuId) || null;

  // Fetch items for selected menu
  const menuItems = selectedMenu
    ? await prisma.menuItem.findMany({
        where: { menuId: selectedMenuId },
        orderBy: { sortOrder: "asc" },
      })
    : [];

  // Filter root items & child items
  const rootItems = menuItems.filter((item) => !item.parentId);
  const getChildren = (parentId: string) => menuItems.filter((item) => item.parentId === parentId);

  // Edit contexts
  const editingMenu = sp.editMenu === "true" && selectedMenu ? selectedMenu : null;
  const editingItem = sp.editItem ? menuItems.find((item) => item.id === sp.editItem) ?? null : null;
  const isCreatingMenu = sp.newMenu === "true";
  const isCreatingItem = sp.newItem === "true" && selectedMenu;

  return (
    <div className="space-y-8 pb-16">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="font-outfit text-3xl font-black text-[#041635] flex items-center gap-3">
            <Layers className="h-8 w-8 text-[#2691F0]" />
            Header & Navigation CMS
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Build and manage multi-level responsive header and mobile navigation hierarchies.
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <a
            href="/admin/navigation?newMenu=true"
            className="inline-flex items-center gap-2 bg-[#041635] text-white font-bold text-xs px-4 py-2.5 rounded-xl hover:bg-[#2691F0] transition-colors"
          >
            <Plus className="h-4 w-4" />
            New Menu Location
          </a>
          {selectedMenu && (
            <a
              href={`/admin/navigation?menuId=${selectedMenuId}&newItem=true`}
              className="inline-flex items-center gap-2 bg-[#2691F0] text-white font-bold text-xs px-4 py-2.5 rounded-xl hover:bg-[#041635] transition-colors"
            >
              <Plus className="h-4 w-4" />
              Add Link to Menu
            </a>
          )}
        </div>
      </div>

      {/* Menu Location Selector */}
      <div className="flex flex-wrap gap-2 items-center border-b border-slate-200 pb-4">
        <span className="text-xs font-black uppercase tracking-wider text-slate-400 mr-2">
          Select Location:
        </span>
        {menus.map((m) => (
          <div key={m.id} className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
            <a
              href={`/admin/navigation?menuId=${m.id}`}
              className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-colors ${
                selectedMenuId === m.id
                  ? "bg-[#041635] text-white"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {m.name} ({m.location})
            </a>
            {selectedMenuId === m.id && (
              <a
                href={`/admin/navigation?menuId=${m.id}&editMenu=true`}
                className="p-1 text-slate-400 hover:text-blue-500 hover:bg-slate-50 rounded"
                title="Edit location name"
              >
                <Pencil className="h-3.5 w-3.5" />
              </a>
            )}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Navigation Link Hierarchy */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
            <h3 className="font-outfit font-black text-slate-800 flex items-center gap-2">
              <FolderTree className="h-5 w-5 text-[#2691F0]" />
              Hierarchy Structure
            </h3>
            {selectedMenu && (
              <span className="text-xs font-mono bg-slate-100 text-slate-500 px-2 py-0.5 rounded">
                {selectedMenu.location}
              </span>
            )}
          </div>

          {rootItems.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <Layers className="h-10 w-10 mx-auto mb-3 text-slate-300" />
              <p className="text-sm font-semibold">No menu links configured in this location.</p>
              <p className="text-xs text-slate-400 mt-1">Click &quot;Add Link to Menu&quot; to populate your links.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {rootItems.map((item, index) => {
                const children = getChildren(item.id);
                return (
                  <div key={item.id} className="border border-slate-100 rounded-xl overflow-hidden shadow-sm">
                    {/* Parent row */}
                    <div className="flex items-center justify-between bg-slate-50/50 p-4 hover:bg-slate-50 transition-colors">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className={`font-bold text-sm ${!item.isVisible ? "text-slate-400 line-through" : "text-[#041635]"}`}>
                            {item.label}
                          </span>
                          {item.openInNewTab && (
                            <ExternalLink className="h-3 w-3 text-slate-400" />
                          )}
                          {!item.isVisible && (
                            <span className="bg-slate-200 text-slate-500 text-[8px] font-black uppercase px-1.5 py-0.5 rounded">
                              Hidden
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 font-mono">
                          {item.url} {item.iconKey && `• Icon: ${item.iconKey}`}
                        </p>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {/* Reordering Controls */}
                        <form action={reorderMenuItems} className="flex">
                          <input
                            type="hidden"
                            name="ids"
                            value={JSON.stringify(
                              index > 0
                                ? rootItems.map((ri, rIdx) => {
                                    if (rIdx === index - 1) return rootItems[index].id;
                                    if (rIdx === index) return rootItems[index - 1].id;
                                    return ri.id;
                                  })
                                : []
                            )}
                          />
                          <button
                            type="submit"
                            disabled={index === 0}
                            className="p-1 text-slate-400 hover:text-slate-800 disabled:opacity-30 rounded hover:bg-slate-200 transition-colors"
                          >
                            <ArrowUp className="h-4 w-4" />
                          </button>
                        </form>

                        <form action={reorderMenuItems} className="flex">
                          <input
                            type="hidden"
                            name="ids"
                            value={JSON.stringify(
                              index < rootItems.length - 1
                                ? rootItems.map((ri, rIdx) => {
                                    if (rIdx === index) return rootItems[index + 1].id;
                                    if (rIdx === index + 1) return rootItems[index].id;
                                    return ri.id;
                                  })
                                : []
                            )}
                          />
                          <button
                            type="submit"
                            disabled={index === rootItems.length - 1}
                            className="p-1 text-slate-400 hover:text-slate-800 disabled:opacity-30 rounded hover:bg-slate-200 transition-colors"
                          >
                            <ArrowDown className="h-4 w-4" />
                          </button>
                        </form>

                        <a
                          href={`/admin/navigation?menuId=${selectedMenuId}&editItem=${item.id}`}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-[#2691F0] hover:bg-blue-50 transition-colors"
                          title="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </a>
                        <form action={deleteMenuItem}>
                          <input type="hidden" name="id" value={item.id} />
                          <DeleteButton message={`Delete link "${item.label}"? Any nested dropdowns will also be removed.`} />
                        </form>
                      </div>
                    </div>

                    {/* Children rows */}
                    {children.length > 0 && (
                      <div className="border-t border-slate-100 divide-y divide-slate-50 pl-8 bg-white">
                        {children.map((child, childIndex) => (
                          <div key={child.id} className="flex items-center justify-between p-3.5 hover:bg-slate-50/50 transition-colors">
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-2">
                                <span className={`font-semibold text-xs ${!child.isVisible ? "text-slate-400 line-through" : "text-slate-800"}`}>
                                  {child.label}
                                </span>
                                {child.openInNewTab && (
                                  <ExternalLink className="h-2.5 w-2.5 text-slate-400" />
                                )}
                                {!child.isVisible && (
                                  <span className="bg-slate-200 text-slate-500 text-[7px] font-black uppercase px-1 py-0.5 rounded">
                                    Hidden
                                  </span>
                                )}
                              </div>
                              <p className="text-[10px] text-slate-400 font-mono">
                                {child.url}
                              </p>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              {/* Child Reordering */}
                              <form action={reorderMenuItems} className="flex">
                                <input
                                  type="hidden"
                                  name="ids"
                                  value={JSON.stringify(
                                    childIndex > 0
                                      ? children.map((ci, cIdx) => {
                                          if (cIdx === childIndex - 1) return children[childIndex].id;
                                          if (cIdx === childIndex) return children[childIndex - 1].id;
                                          return ci.id;
                                        })
                                      : []
                                  )}
                                />
                                <button
                                  type="submit"
                                  disabled={childIndex === 0}
                                  className="p-1 text-slate-400 hover:text-slate-800 disabled:opacity-30 rounded hover:bg-slate-200 transition-colors"
                                >
                                  <ArrowUp className="h-3 w-3" />
                                </button>
                              </form>

                              <form action={reorderMenuItems} className="flex">
                                <input
                                  type="hidden"
                                  name="ids"
                                  value={JSON.stringify(
                                    childIndex < children.length - 1
                                      ? children.map((ci, cIdx) => {
                                          if (cIdx === childIndex) return children[childIndex + 1].id;
                                          if (cIdx === childIndex + 1) return children[childIndex].id;
                                          return ci.id;
                                        })
                                      : []
                                  )}
                                />
                                <button
                                  type="submit"
                                  disabled={childIndex === children.length - 1}
                                  className="p-1 text-slate-400 hover:text-slate-800 disabled:opacity-30 rounded hover:bg-slate-200 transition-colors"
                                >
                                  <ArrowDown className="h-3 w-3" />
                                </button>
                              </form>

                              <a
                                href={`/admin/navigation?menuId=${selectedMenuId}&editItem=${child.id}`}
                                className="p-1 rounded-lg text-slate-400 hover:text-[#2691F0] hover:bg-blue-50 transition-colors"
                                title="Edit"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </a>
                              <form action={deleteMenuItem}>
                                <input type="hidden" name="id" value={child.id} />
                                <DeleteButton message={`Delete sub-link "${child.label}"?`} />
                              </form>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Editor sidebar panel */}
        <div className="lg:col-span-5">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sticky top-24">
            
            {/* Create Menu Form */}
            {isCreatingMenu && (
              <form action={createMenu} className="space-y-4">
                <h3 className="font-outfit text-lg font-black text-[#041635]">Create Menu Location</h3>
                <label className="block text-sm font-bold text-slate-700">
                  Menu Name
                  <input
                    name="name"
                    required
                    placeholder="e.g. Primary Header Navbar"
                    className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-[#041635] focus:ring-2 focus:ring-[#2691F0] focus:outline-none"
                  />
                </label>
                <label className="block text-sm font-bold text-slate-700">
                  Unique Code/Location
                  <input
                    name="location"
                    required
                    placeholder="e.g. header"
                    className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-[#041635] focus:ring-2 focus:ring-[#2691F0] focus:outline-none font-mono"
                  />
                </label>
                <div className="flex gap-2 pt-4">
                  <Button type="submit" className="flex-1 bg-[#041635] text-white hover:bg-[#2691F0] py-3 rounded-xl font-bold">
                    Create Location
                  </Button>
                  <a href={`/admin/navigation?menuId=${selectedMenuId}`} className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold px-4 py-3 rounded-xl text-sm text-center">
                    Cancel
                  </a>
                </div>
              </form>
            )}

            {/* Edit Menu Location */}
            {editingMenu && (
              <form action={updateMenu} className="space-y-4">
                <input type="hidden" name="id" value={editingMenu.id} />
                <h3 className="font-outfit text-lg font-black text-[#041635]">Edit Location: {editingMenu.name}</h3>
                
                <label className="block text-sm font-bold text-slate-700">
                  Menu Location Name
                  <input
                    name="name"
                    required
                    defaultValue={editingMenu.name}
                    className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-[#041635] focus:ring-2 focus:ring-[#2691F0] focus:outline-none"
                  />
                </label>

                <label className="block text-sm font-bold text-slate-700">
                  Location Code
                  <input
                    name="location"
                    required
                    defaultValue={editingMenu.location}
                    className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-[#041635] focus:ring-2 focus:ring-[#2691F0] focus:outline-none font-mono"
                  />
                </label>

                <div className="flex gap-2 pt-4">
                  <Button type="submit" className="flex-1 bg-[#041635] text-white hover:bg-[#2691F0] py-3 rounded-xl font-bold">
                    Save Location
                  </Button>
                  <a href={`/admin/navigation?menuId=${selectedMenuId}`} className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold px-4 py-3 rounded-xl text-sm text-center">
                    Cancel
                  </a>
                </div>
              </form>
            )}

            {/* Create Menu Item Link */}
            {isCreatingItem && (
              <form action={createMenuItem} className="space-y-4">
                <input type="hidden" name="menuId" value={selectedMenuId} />
                <h3 className="font-outfit text-lg font-black text-[#041635]">
                  Add Link to {selectedMenu.name}
                </h3>
                
                <ItemFormFields pages={pages} rootItems={rootItems} />

                <div className="flex gap-2 pt-4">
                  <Button type="submit" className="flex-1 bg-[#041635] text-white hover:bg-[#2691F0] py-3 rounded-xl font-bold">
                    Add Link Item
                  </Button>
                  <a href={`/admin/navigation?menuId=${selectedMenuId}`} className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold px-4 py-3 rounded-xl text-sm text-center">
                    Cancel
                  </a>
                </div>
              </form>
            )}

            {/* Edit Menu Item Link */}
            {editingItem && (
              <form action={updateMenuItem} className="space-y-4">
                <input type="hidden" name="id" value={editingItem.id} />
                <h3 className="font-outfit text-lg font-black text-[#041635]">
                  Editing Link: {editingItem.label}
                </h3>

                <ItemFormFields pages={pages} rootItems={rootItems.filter((i) => i.id !== editingItem.id)} defaults={editingItem} />

                <div className="flex gap-2 pt-4">
                  <Button type="submit" className="flex-1 bg-[#041635] text-white hover:bg-[#2691F0] py-3 rounded-xl font-bold">
                    Save Changes
                  </Button>
                  <a href={`/admin/navigation?menuId=${selectedMenuId}`} className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold px-4 py-3 rounded-xl text-sm text-center">
                    Cancel
                  </a>
                </div>
              </form>
            )}

            {/* Neutral selection placeholder */}
            {!isCreatingMenu && !editingMenu && !isCreatingItem && !editingItem && (
              <div className="text-center py-20 text-slate-300">
                <Layers className="h-10 w-10 mx-auto mb-3" />
                <h4 className="font-outfit font-black text-slate-600 text-base">Select Link or Create Item</h4>
                <p className="text-xs font-semibold text-slate-400 max-w-xs mx-auto mt-1 leading-relaxed">
                  Choose a menu item edit button from the left side list or add a new link to construct responsive, layered menus.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ItemFormFields({
  pages,
  rootItems,
  defaults,
}: {
  pages: { id: string; title: string; slug: string }[];
  rootItems: any[];
  defaults?: any;
}) {
  return (
    <>
      <label className="block text-sm font-bold text-slate-700">
        Display Label
        <input
          name="label"
          required
          defaultValue={defaults?.label}
          placeholder="e.g. About Us"
          className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-[#041635] focus:ring-2 focus:ring-[#2691F0] focus:outline-none"
        />
      </label>

      <label className="block text-sm font-bold text-slate-700">
        Link Destination URL
        <input
          name="url"
          required
          defaultValue={defaults?.url}
          placeholder="e.g. /about"
          className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-[#041635] focus:ring-2 focus:ring-[#2691F0] focus:outline-none"
        />
      </label>

      <div className="grid grid-cols-2 gap-4">
        <label className="block text-sm font-bold text-slate-700">
          Or Link to Core Page
          <select
            name="pageId"
            defaultValue={defaults?.pageId || ""}
            className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs text-[#041635] focus:ring-2 focus:ring-[#2691F0] focus:outline-none bg-white font-semibold"
          >
            <option value="">Custom/External URL</option>
            {pages.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title} (/{p.slug})
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm font-bold text-slate-700">
          Parent Menu Item (Dropdown)
          <select
            name="parentId"
            defaultValue={defaults?.parentId || ""}
            className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs text-[#041635] focus:ring-2 focus:ring-[#2691F0] focus:outline-none bg-white font-semibold"
          >
            <option value="">None (Top Level Link)</option>
            {rootItems.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label} (Parent)
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <label className="block text-sm font-bold text-slate-700">
          Icon Identifier (Optional)
          <input
            name="iconKey"
            defaultValue={defaults?.iconKey}
            placeholder="e.g. Shield, Cpu, Users"
            className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-[#041635] focus:ring-2 focus:ring-[#2691F0] focus:outline-none"
          />
        </label>

        <label className="block text-sm font-bold text-slate-700">
          Visibility State
          <select
            name="isVisible"
            defaultValue={defaults?.isVisible !== false ? "true" : "false"}
            className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs text-[#041635] focus:ring-2 focus:ring-[#2691F0] focus:outline-none bg-white font-semibold"
          >
            <option value="true">Visible</option>
            <option value="false">Hidden</option>
          </select>
        </label>
      </div>

      <label className="flex items-center gap-2 pt-2 text-slate-700 text-sm font-bold cursor-pointer">
        <input
          type="checkbox"
          name="openInNewTab"
          value="true"
          defaultChecked={defaults?.openInNewTab}
          className="rounded border-slate-300 text-[#2691F0] focus:ring-[#2691F0] h-4 w-4"
        />
        Open Link in New Tab
      </label>
    </>
  );
}
