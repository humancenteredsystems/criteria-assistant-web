// Diagnostics module exports
export { 
  validateAlignment,
  createAlignmentValidator,
  PerformanceTracker,
  createPerformanceMonitor,
  logAlignmentDetails,
  performanceTracker
} from './diagnostics';

export {
  validateTextAlignment,
  generateAlignmentReport,
  quickValidation,
  type AlignmentReport,
  type AlignmentIssue
} from './textAlignment';
