import { listIncidents, searchIncidents } from '../../core/storage.js';
import { renderIncidentTable } from '../ui/banners.js';

export function listCommandAction(options: {
  limit?: string;
  json?: boolean;
  search?: string;
  status?: 'failed' | 'success';
  exitCode?: string;
}): void {
  const limit = options.limit ? parseInt(options.limit, 10) : 10;
  const exitCode = options.exitCode !== undefined ? parseInt(options.exitCode, 10) : undefined;

  let incidents;
  if (options.search || options.status || exitCode !== undefined) {
    incidents = searchIncidents({
      query: options.search,
      status: options.status,
      exitCode,
      limit
    });
  } else {
    incidents = listIncidents(limit);
  }

  if (options.json) {
    console.log(JSON.stringify(incidents, null, 2));
    return;
  }

  renderIncidentTable(incidents);
}
