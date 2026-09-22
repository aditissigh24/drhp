"use client"

import React, { useCallback, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, ChevronRight, Download, Plus, UploadCloud, FileText, X, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import SectionHeaderWithFlags from '@/components/custom/SectionHeaderWithFlags';
import CustomList from '@/components/custom/CustomList/customList';
import { BubbleTag } from '@/components/custom/BubbleTag';
import { TertiaryFilterGroup } from '@/components/custom/CustomList/customListFilter';
import { CompanyItem, companies, companyUrlSlug } from '@/app/data/companies';

/**
 * The watchlist.
 *
 * Ported from the surveillance UI's WatchlistTab, minus everything that needs a
 * server: pipeline polling and its progress bar, Run / Run All, bulk CSV
 * upload, the add-company search dialog, delete mode and run history. This app
 * is a static export with no API, so those controls would be dead chrome.
 *
 * What is kept is the visual contract — the section header, the metric cards,
 * the search bar, and the row card with its status bubble, blue 19px company
 * name, chip rail and chevron.
 *
 * The Add Company dialog re-uses upstream's own markup: the green outline
 * toolbar button from its add flow, and the dragger from its bulk-upload
 * dialog. It adds the row to local state only — there is no ingestion service
 * to hand a document to, so an added company is parked as PENDING and is not
 * clickable (nothing behind it to open). See the note on handleAddCompany.
 */

const formatDate = (iso?: string | null): string => {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${day}-${month}-${d.getFullYear()}`;
};

/** "DD-MM-YYYY → DD-MM-YYYY", or "NA" when either end is missing. */
const formatDateRange = (range?: { start: string | null; end: string | null } | null): string => {
  if (!range || !range.start || !range.end) return 'NA';
  const start = formatDate(range.start);
  const end = formatDate(range.end);
  if (!start || !end) return 'NA';
  return `${start} → ${end}`;
};

export default function WatchlistTab() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');

  // Rows are seeded from the static list and can be appended to locally.
  const [rows, setRows] = useState<CompanyItem[]>(companies);

  // Add Company dialog
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleSelectFile = useCallback((f: File | null) => {
    setAddError(null);
    if (!f) { setFile(null); return; }
    const ok = /\.(pdf|csv|xlsx|xls)$/i.test(f.name);
    if (!ok) {
      setAddError('Unsupported file type. Use PDF, CSV or Excel.');
      return;
    }
    setFile(f);
  }, []);

  /**
   * Native drag listeners bound to the real dropzone node. React's synthetic
   * drag events don't fire reliably on content inside the Radix Dialog portal,
   * so they're attached to the DOM node via a callback ref — same approach as
   * upstream's bulk-upload dragger.
   */
  const dropzoneCleanupRef = useRef<null | (() => void)>(null);
  const setDropzoneRef = useCallback((node: HTMLDivElement | null) => {
    if (dropzoneCleanupRef.current) {
      dropzoneCleanupRef.current();
      dropzoneCleanupRef.current = null;
    }
    if (!node) return;

    const onEnter = (e: DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); };
    const onOver = (e: DragEvent) => {
      e.preventDefault(); e.stopPropagation();
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
      setIsDragging(true);
    };
    const onLeave = (e: DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); };
    const onDropNative = (e: DragEvent) => {
      e.preventDefault(); e.stopPropagation();
      setIsDragging(false);
      handleSelectFile(e.dataTransfer?.files?.[0] || null);
    };

    node.addEventListener('dragenter', onEnter);
    node.addEventListener('dragover', onOver);
    node.addEventListener('dragleave', onLeave);
    node.addEventListener('drop', onDropNative);

    dropzoneCleanupRef.current = () => {
      node.removeEventListener('dragenter', onEnter);
      node.removeEventListener('dragover', onOver);
      node.removeEventListener('dragleave', onLeave);
      node.removeEventListener('drop', onDropNative);
    };
  }, [handleSelectFile]);

  const closeAddDialog = useCallback(() => {
    if (isSaving) return;
    setIsAddOpen(false);
    setNewName('');
    setFile(null);
    setIsDragging(false);
    setAddError(null);
  }, [isSaving]);

  /**
   * Adds the row to local state. Nothing is uploaded: there is no ingestion
   * service in this app, so the chosen file is recorded by name on the row and
   * the company is parked as PENDING rather than pretending a run happened.
   */
  const handleAddCompany = useCallback(() => {
    const name = newName.trim();
    if (!name) { setAddError('Enter a company name.'); return; }
    if (rows.some((c) => c.legalName.toLowerCase() === name.toLowerCase())) {
      setAddError('That company is already on the watchlist.');
      return;
    }
    setIsSaving(true);
    const today = new Date().toISOString().slice(0, 10);
    const added: CompanyItem = {
      id: `local-${Date.now()}`,
      legalName: name,
      status: 'PENDING',
      docType: file ? (file.name.split('.').pop() || 'DOC').toUpperCase() : 'DRHP',
      // Kept short: the section chip is fixedWidth 110 and 'Awaiting document'
      // truncated to 'waiting documen'.
      section: file ? file.name : 'No document',
      pages: '—',
      dateRange: { start: today, end: null },
      docId: '',
      runId: '',
      drhpPdf: '',
      sourcePdf: '',
    };
    setRows((prev) => [...prev, added]);
    setIsSaving(false);
    closeAddDialog();
  }, [newName, file, rows, closeAddDialog]);

  const openInvestigation = useCallback((company: CompanyItem) => {
    router.push(`/investigation/${companyUrlSlug(company)}`);
  }, [router]);

  const createWatchlistItem = useCallback((company: CompanyItem) => {
    const statusLower = (company.status || '').toLowerCase();
    let statusColor: 'green' | 'yellow' | 'red' = 'green';
    if (['pending', 'running', 'queued', 'processing'].includes(statusLower)) statusColor = 'yellow';
    else if (['failed', 'error'].includes(statusLower)) statusColor = 'red';

    const statusLabel = company.status
      ? company.status.charAt(0).toUpperCase() + company.status.slice(1).toLowerCase()
      : 'Unknown';

    return {
      itemID: company.id,
      title: (
        <div className="flex items-center gap-3">
          <BubbleTag text={statusLabel} color={statusColor} withBorder={true} fixedWidth={120} />
          <span className="text-[19px] font-bold text-blue-600">{company.legalName}</span>
        </div>
      ),
      topRightContent: (
        <div className="flex items-center gap-3">
          <BubbleTag text={company.docType} color="grayTextWhiteBg" withBorder={true} fixedWidth={70} />
          <BubbleTag text={company.section} color="blueTextWhiteBg" withBorder={true} fixedWidth={110} />
          <BubbleTag text={`Pages ${company.pages}`} color="grayTextWhiteBg" withBorder={true} fixedWidth={120} />
          <BubbleTag text={formatDateRange(company.dateRange)} color="yellowTextWhiteBg" withBorder={true} fixedWidth={190} />
        </div>
      ),
      // No chevron on a row that cannot be opened — there is no verification
      // run behind a locally added company, so the affordance would lie.
      rightMainIcon: company.docId ? ChevronRight : undefined,
      originalData: company,
    };
  }, []);

  const items = useMemo(() => rows.map(createWatchlistItem), [rows, createWatchlistItem]);

  const handleItemClick = useCallback((item: any) => {
    const company = item.originalData as CompanyItem | undefined;
    // Locally added companies have no verification run behind them, so there
    // is nothing to open — the row stays inert rather than routing to another
    // company's document.
    if (company && company.docId) openInvestigation(company);
  }, [openInvestigation]);

  /**
   * Cards count the companies on the watchlist by run status, so they describe
   * the list itself and move when a company is added. They are read-only: with
   * this few rows, clicking one to filter would be theatre.
   *
   * These used to be claim counts read out of verification.json, which is why
   * the labels and the values had drifted apart — "Completed" was showing the
   * unbacked-claim count. Everything now derives from `rows`.
   */
  const cardMetrics = useMemo(() => {
    const bucket = (status: string) => {
      const v = (status || '').toLowerCase();
      if (v === 'completed' || v === 'complete' || v === 'done') return 'completed';
      if (v === 'failed' || v === 'error') return 'failed';
      if (v === 'running' || v === 'processing' || v === 'queued') return 'inProgress';
      return 'pending';
    };
    const tally = { completed: 0, failed: 0, inProgress: 0, pending: 0 };
    for (const c of rows) tally[bucket(c.status) as keyof typeof tally] += 1;

    return [
      { label: 'Total Companies', value: rows.length,      icon: 'LayoutGrid',   colorScheme: 'blue'   as const },
      { label: 'Completed',       value: tally.completed,  icon: 'CheckCircle2', colorScheme: 'green'  as const },
      { label: 'Failed',          value: tally.failed,     icon: 'XCircle',      colorScheme: 'red'    as const },
      { label: 'In Progress',     value: tally.inProgress, icon: 'Loader',       colorScheme: 'orange' as const },
      { label: 'Pending',         value: tally.pending,    icon: 'Clock',        colorScheme: 'yellow' as const },
    ];
  }, [rows]);

  const tertiaryFilterGroups = useMemo<TertiaryFilterGroup[]>(() => [
    {
      id: 'search',
      label: 'Search',
      type: 'searchbar' as const,
      options: [],
      selectedValues: searchQuery ? [searchQuery] : [],
      onFilterChange: () => { },
      onSearchChange: (val: string) => setSearchQuery(val),
      filterFunction: (item: any, selectedValues: string[]) => {
        const q = (selectedValues[0] || '').toString().trim().toLowerCase();
        if (!q) return true;
        const d: Partial<CompanyItem> = item.originalData || {};
        return [d.legalName, d.docType, d.section, d.docId, d.status]
          .some((f) => (f || '').toString().toLowerCase().includes(q));
      },
      showLabel: false,
      searchPlaceholder: 'Search by company, document, section or run id...',
      actionElements: (
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setIsAddOpen(true)}
            variant="outline"
            className="border-green-600 text-green-600 hover:bg-green-50 h-10 px-2.5 font-semibold shadow-sm flex items-center gap-2 transition-all active:scale-95"
          >
            <Plus size={16} /> Add Company
          </Button>
        </div>
      ),
    },
  ], [searchQuery]);

  const handleExportCSV = useCallback(() => {
    const header = ['Company', 'Status', 'Document', 'Section', 'Pages', 'Filed', 'Verified', 'Doc ID'];
    const csvRows = rows.map((c) => [
      c.legalName, c.status, c.docType, c.section, c.pages,
      formatDate(c.dateRange.start), formatDate(c.dateRange.end), c.docId,
    ]);
    const esc = (v: string) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const csv = [header, ...csvRows].map((r) => r.map(esc).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `watchlist_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [rows]);

  return (
    <div className="w-full px-2 pb-4 space-y-4">
      <div className="mb-4">
        <SectionHeaderWithFlags
          title="Due Diligence Watchlist"
          icon={AlertTriangle}
          iconColorClass="text-blue-700"
          titleColorClass="text-blue-700"
          positiveFlags={[]}
          negativeFlags={[]}
          allowCollapse={false}
          rightElement={
            <div className="flex items-center gap-3">
              <BubbleTag
                text="Export CSV"
                color="blue"
                clickable
                onClick={handleExportCSV}
                withBorder={true}
                hasInsideIcon={true}
                icon={<Download className="h-3 w-3" />}
                size="md"
              />
            </div>
          }
        />
      </div>

      <CustomList
        items={items}
        searchFields={["title"]}
        onItemClick={handleItemClick}
        disableInternalSorting={true}
        showItemSpacing={true}
        showToggleOptionCounts={true}
        showFilterToggle={false}
        initialRowLimit={200}
        showTimeline={false}
        showKeyMetrics={true}
        showKeyMetricsCollapse={false}
        showKeyMetricsHeader={false}
        hardcodedMetrics={cardMetrics}
        tertiaryFilterGroups={tertiaryFilterGroups}
        emptyState={{
          icon: AlertTriangle,
          title: "No watchlist items found",
          description: "No documents are currently under review.",
        }}
      />

      {/* Add Company — company name + a document dragger. Radix centres
          DialogContent in the viewport by default. */}
      <Dialog open={isAddOpen} onOpenChange={(open) => { if (!open) closeAddDialog(); }}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-4 w-4 text-green-600" />
              Add Company
            </DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="company-name" className="text-sm font-medium text-gray-700">
                Company name
              </label>
              <Input
                id="company-name"
                value={newName}
                onChange={(e) => { setNewName(e.target.value); setAddError(null); }}
                onKeyDown={(e) => { if (e.key === 'Enter') handleAddCompany(); }}
                placeholder="e.g. Ultravibrant Integrated Energy Limited"
                autoComplete="off"
                className="w-full"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-gray-700">Document</span>

              {/* Hidden native input, triggered by the dragger / browse link */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.csv,.xlsx,.xls"
                className="hidden"
                onChange={(e) => handleSelectFile(e.target.files?.[0] || null)}
              />

              <div
                ref={setDropzoneRef}
                role="button"
                tabIndex={0}
                onClick={() => fileInputRef.current?.click()}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click(); }}
                className={`flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-6 py-10 text-center cursor-pointer transition-colors ${
                  isDragging
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-300 hover:border-green-400 hover:bg-gray-50'
                }`}
              >
                {/* Children are non-interactive so drag/drop always targets the dragger div */}
                <div className="pointer-events-none flex flex-col items-center gap-2">
                  <UploadCloud className={`h-10 w-10 ${isDragging ? 'text-green-600' : 'text-gray-400'}`} />
                  <p className="text-sm font-medium text-gray-700">
                    Drag &amp; drop a file here, or <span className="text-green-600 underline">browse</span>
                  </p>
                  <p className="text-xs text-gray-400">Supports PDF, CSV and Excel (.pdf, .csv, .xlsx, .xls)</p>
                </div>
              </div>
            </div>

            {file && (
              <div className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5">
                <div className="flex items-center gap-2 min-w-0">
                  <FileText className="h-4 w-4 text-green-600 shrink-0" />
                  <span className="text-sm font-medium text-gray-700 truncate">{file.name}</span>
                  <span className="text-xs text-gray-400 shrink-0">{(file.size / 1024).toFixed(1)} KB</span>
                </div>
                <button
                  onClick={() => handleSelectFile(null)}
                  className="text-gray-400 hover:text-gray-600 transition-colors shrink-0"
                  title="Remove file"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            {addError && (
              <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{addError}</p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeAddDialog} disabled={isSaving}>
              Cancel
            </Button>
            <Button
              onClick={handleAddCompany}
              disabled={!newName.trim() || isSaving}
              className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2"
            >
              {isSaving ? <><Loader2 className="h-4 w-4 animate-spin" /> Adding…</> : <><Plus className="h-4 w-4" /> Add Company</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
