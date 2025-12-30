"use client";

import { useState } from "react";
import {
  Copy,
  Download,
  Check,
  Clock,
  FileText,
  Trophy,
  AlertCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { BenchmarkResults, BenchmarkStats } from "@/lib/ocr/types";
import {
  compareBenchmarks,
  downloadBenchmarkResults,
} from "@/lib/ocr/benchmark";

interface BenchmarkResultsViewProps {
  results: BenchmarkResults | null;
  isLoading?: boolean;
}

function StatsBadge({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}) {
  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${color}`}>
      <Icon className="h-3 w-3" />
      <span>{label}:</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}

function StatsOverview({ stats }: { stats: BenchmarkStats }) {
  if (stats.successCount === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2 mb-4">
      {stats.fastest && (
        <StatsBadge
          label="Fastest"
          value={`${stats.fastest.providerName} (${(stats.fastest.timeMs / 1000).toFixed(2)}s)`}
          icon={Trophy}
          color="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
        />
      )}
      {stats.mostCharacters && (
        <StatsBadge
          label="Most Text"
          value={`${stats.mostCharacters.providerName} (${stats.mostCharacters.charCount.toLocaleString()} chars)`}
          icon={FileText}
          color="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
        />
      )}
      <StatsBadge
        label="Avg Time"
        value={`${(stats.averageTimeMs / 1000).toFixed(2)}s`}
        icon={Clock}
        color="bg-stone-100 text-stone-800 dark:bg-stone-800/50 dark:text-stone-300"
      />
      {stats.errorCount > 0 && (
        <StatsBadge
          label="Errors"
          value={`${stats.errorCount}`}
          icon={AlertCircle}
          color="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
        />
      )}
    </div>
  );
}

function ProviderResultCard({
  providerId,
  providerName,
  result,
  error,
  status,
  isFastest,
  hasMostChars,
}: {
  providerId: string;
  providerName: string;
  result: BenchmarkResults["results"][0]["result"];
  error: string | null;
  status: BenchmarkResults["results"][0]["status"];
  isFastest: boolean;
  hasMostChars: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(true);

  const handleCopy = async () => {
    if (!result) return;
    await navigator.clipboard.writeText(result.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!result) return;
    const blob = new Blob([result.text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ocr-${providerId}-result.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Pending or processing state
  if (status === "pending" || status === "processing") {
    return (
      <Card className="w-full">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            {providerName}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <div className="flex items-center gap-3 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm">
              {status === "pending" ? "Waiting..." : "Processing..."}
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (status === "error" || error) {
    return (
      <Card className="w-full border-destructive/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            {providerName}
            <AlertCircle className="h-4 w-4 text-destructive" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-destructive/10 text-destructive rounded-lg p-4 text-sm">
            {error || "Processing failed"}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Success state
  if (!result) return null;

  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CardTitle className="text-base flex items-center gap-2">
              {providerName}
            </CardTitle>
            {isFastest && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 rounded text-xs font-medium">
                <Trophy className="h-3 w-3" />
                Fastest
              </span>
            )}
            {hasMostChars && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 rounded text-xs font-medium">
                <FileText className="h-3 w-3" />
                Most Text
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {(result.processingTimeMs / 1000).toFixed(2)}s
              </span>
              <span className="flex items-center gap-1">
                <FileText className="h-3 w-3" />
                {result.text.length.toLocaleString()} chars
              </span>
              {result.pages.length > 1 && (
                <span>{result.pages.length} pages</span>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpanded(!expanded)}
              className="h-7 w-7 p-0"
            >
              {expanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      {expanded && (
        <CardContent className="pt-2">
          <div className="flex gap-2 mb-3">
            <Button variant="outline" size="sm" onClick={handleCopy} className="h-7 text-xs">
              {copied ? (
                <>
                  <Check className="h-3 w-3 mr-1" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3 mr-1" />
                  Copy
                </>
              )}
            </Button>
            <Button variant="outline" size="sm" onClick={handleDownload} className="h-7 text-xs">
              <Download className="h-3 w-3 mr-1" />
              TXT
            </Button>
          </div>
          <div className="bg-muted rounded-lg p-4 overflow-y-auto max-h-80">
            <pre className="whitespace-pre-wrap text-sm font-mono text-foreground leading-relaxed">
              {result.text}
            </pre>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

export function BenchmarkResultsView({
  results,
  isLoading,
}: BenchmarkResultsViewProps) {
  if (!results && !isLoading) {
    return null;
  }

  // Show loading state when processing
  if (isLoading && !results) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex flex-col items-center justify-center gap-4">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="text-muted-foreground">Processing documents...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!results) return null;

  const stats = compareBenchmarks(results);

  return (
    <div className="space-y-4">
      {/* Header with stats and export */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold mb-2">Benchmark Results</h2>
          <StatsOverview stats={stats} />
        </div>
        {stats.successCount > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background shadow-xs hover:bg-accent hover:text-accent-foreground h-8 px-3">
              <Download className="h-4 w-4" />
              Export
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => downloadBenchmarkResults(results, "json")}>
                Export as JSON
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => downloadBenchmarkResults(results, "csv")}>
                Export as CSV
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Results stack */}
      <div className="flex flex-col gap-4">
        {results.results.map((r) => (
          <ProviderResultCard
            key={r.providerId}
            providerId={r.providerId}
            providerName={r.providerName}
            result={r.result}
            error={r.error}
            status={r.status}
            isFastest={stats.fastest?.providerId === r.providerId}
            hasMostChars={stats.mostCharacters?.providerId === r.providerId}
          />
        ))}
      </div>
    </div>
  );
}
