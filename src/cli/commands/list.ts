import { listIncidents } from '../../core/storage.js';
import { renderIncidentTable } from '../ui/banners.js';

export function listCommandAction(options: { limit?: string; json?: boolean }): void {
  const limit = options.limit ? parseInt(options.limit, 10) : 10;
  const incidents = listIncidents(limit);

  if (options.json) {
    console.log(JSON.stringify(incidents, null, 2));
    return;
  }

  renderIncidentTable(incidents);
}
