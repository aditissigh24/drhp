export interface ActiveContextType {
  merchant: string | null;
  customer: string | null;
  case: string | null;
  rule: string | null;
}


export interface MerchantItemType {
  id: string;
  cin?: string | null; // Making CIN optional since it might not be available for all merchants
  legalName: string;
  tradeName?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface MerchantProfileType {
  id: string;
  merchant_id: string;
  legal_name: string;
  trade_name?: string;
  created_at: string;
  updated_at: string;
  // Add other fields from your API response
}

// Basic Information Interface
interface BasicInfo {
    legalName: string;
    tradeName: string;
    businessType: string;
    incorporationDate: string;
    industry: string;
    description: string;
    mcaDescription: string;
    businessCategory: string;
    businessSubcategory: string;
    businessModel: string;
    onboardingDate: string;
    kycVerificationStatus: string;
    kycVerificationDate: string;
    onboardingPlatform: string;
  }

  // Contact Interface
  interface Contact {
    id: string;
    type: string | null;
    operatingAddress: string;
    email: string;
    phone: string;
    mobile: string;
    registeredAddress: string;
    merchant_id: string;
    contactPerson: string;
    altPhone: string;
    created_at: string;
  }

  // Online Presence Interface
  interface OnlinePresence {
    merchant_id: string;
    id: string;
    created_at: string;
    platform: string;
    url: string;
  }

  // Compliance Interface
  interface Compliance {
    merchant_id: string;
    created_at: string;
    status: string;
    document_type: string;
    id: string;
    document_number: string;
    last_updated: string;
  }

  // Financial Interface
  interface Financial {
    merchant_id: string;
    monthlyVolume: number;
    successRate: number;
    refundRate: number;
    disputeRate: number;
    ifsc: string;
    accountType: string;
    created_at: string;
    averageTicketSize: number;
    id: string;
    chargebackRate: number;
    accountNumber: string;
    bankName: string;
    verificationStatus: string;
  }

  // Main Merchant Profile Interface
export interface MerchantProfileType {
    basicInfo: BasicInfo;
    contacts: Contact[];
    onlinePresence: OnlinePresence[];
    compliance: Compliance[];
    financial: Financial[];
  }

// Key Metrics Interface
export interface KeyMetric {
  id: string;
  merchant_id: string;
  total_amount: number;
  total_count: number;
  total_num_investigations: number;
  chargeback_percentage: number;
  date_of_onboarding: number;
  average_payout_size: number;
  integration_types: string;
  created_at: string;
  business_category: string;
  business_type: string;
  merchant_legalName: string;
  current_balance_in_ledger: number;
  average_daily_transactions: number;
  account_status: string;
  no_of_unique_customers: number;
}

export interface KeyMetricListType {
  key_metrics: KeyMetric[];
}
// should be changed to the new format
// Risk Indicator Interface
interface RiskIndicator {
  label: string;
  value: string;
  severity: 'low' | 'medium' | 'high';
}

// Risk Category Interface
export interface RiskCategory {
  title: string;
  score: number;
  description: string;
  indicators: RiskIndicator[];
}

// Quartiles Interface (new)
interface Quartiles {
  q0: number;
  q1: number;
  q2: number;
  q3: number;
}

// Score Details Interface (new)
interface ScoreDetails {
  percentile: string;
  max_score: number;
  quartiles: Quartiles;
}

// Risk Assessment Interface (updated)
export interface RiskAssessment {
  risk_score: number;
  overall: ScoreDetails;
  business_category: ScoreDetails;
  risk_level: string;
  description: string;
  categories: RiskCategory[];
}

// Flag Interface
export interface Flag {
  flag_type: string;
  severity: 'critical' | 'high' | 'medium' | 'low';  // Normalized severity levels
  created_at: string;
  merchant_id: string;
  id: string;
  text: string;
  timestamp: string;
  importance: number;
}

// Flags List Interface
export interface FlagsList {
  flags: Flag[];
}

// Network Overview Interface
export interface NetworkOverview {
  network_risk_score: number;
  merchant_id: string;
  total_connections: number;
  created_at: string;
  id: string;
  high_risk_connections: number;
  directors_count: number | null;
}

// New Edge Interface
export interface Edge {
  fromNode: string;
  toNode: string;
  relationship_type: string;
}

// New Community Interface
export interface Community {
  entities: LinkedEntity[];
  edges: Edge[];  // Simplified to single array of edges
  paths?: {
    source: string;
    intermediate?: string[];  // Array of intermediate nodes for 2nd/3rd degree
    target: string;
    relationshipPath: string[];  // Types of relationships in the path
  }[];
}

// Linked Entity Interface
export interface LinkedEntity {
  related_entity_name: string;
  id: string;
  created_at: string;
  related_entity_id: string;
  relationship_type: string;
  merchant_id: string;
}

// Common Connection Interface
export interface CommonConnection {
  connection_type: string;
  connection_value: string;
  shared_with: string[];
}

// Updated Network Data Interface
export interface NetworkData {
  networkOverview: NetworkOverview;
  firstDegreeCommunity: Community;
  secondDegreeCommunity: Community;
  thirdDegreeCommunity: Community;
  commonConnections: CommonConnection[];
  adjacencyList: Record<string, Edge[]>;
}

// // Website Metrics Interface
// interface WebsiteMetric {
//   domain: string;
//   age: string;
//   traffic_trend_positive: boolean;
//   security_status: string;
//   created_at: string;
//   monthly_traffic: string;
//   id: string;
//   merchant_id: string;
//   traffic_trend_value: string;
//   trust_score: string;
//   last_updated: string;
// }

// // Review Source Interface
// interface ReviewSource {
//   merchant_id: string;
//   id: string;
//   total_reviews: number;
//   sentiment: string;
//   rating: number;
//   platform: string;
//   created_at: string;
// }

// // Social Presence Interface
// interface SocialPresence {
//   icon_type: string;
//   id: string;
//   platform: string;
//   posts_monthly: number;
//   employee_count: number;
//   created_at: string;
//   metrics: number;
//   merchant_id: string;
//   followers: number;
//   engagement_rate: number;
//   verified: boolean;
// }

// // Recent Mention Interface
// interface RecentMention {
//   merchant_id: string;
//   id: string;
//   title: string;
//   snippet: string;
//   source: string;
//   date: string;
//   sentiment: string;
//   created_at: string;
// }

// // Main Digital Footprint Interface
// export interface DigitalFootprintType {
//   websiteMetrics: WebsiteMetric[];
//   reviewSources: ReviewSource[];
//   socialPresence: SocialPresence[];
//   recentMentions: RecentMention[];
// }

// Digital Information Interface

// Event Interface
export interface EventType {
  id: string;
  time: string;
  event: string;
  type: string;
}

// Event Timeline Interface
export interface EventTimelineType {
  events: EventType[];
}

// Document Interface
export interface Document {
  merchant_id: string;
  document_type: string;
  status: string;
  created_at: string;
  document_number: string;
  id: string;
  date_of_upload: string;
}

// Documents List Interface
export interface DocumentsList {
  documents_uploaded: Document[];
}


// Transaction Interface
export interface TransactionType {
  dispute_date: string | null;
  cx_device_id: string | null;
  invoice_amount: number | null;
  id: string;
  country_code: string;
  complain_date: string | null;
  cx_card_number: string | null;
  is_cancelled: boolean | null;
  amount: number;
  timestamp: string;
  cx_pii_linkage_score: number | null;
  txn_currency: string | null;
  transaction_id: string;
  status: string;
  is_cardholder_name_match: boolean | null;
  has_cx_complaint: boolean | null;
  merchant_type: string;
  merchant_name: string;
  created_at: string;
  is_chargeback: boolean | null;
  merchant_id: string;
  risk_score: number;
  is_fraud_transaction: boolean | null;
  is_cx_international: boolean | null;
  transaction_type: string;
  risk_description: string;
  cx_id: string | null;
  txn_status: string | null;
  city: string;
  product_name: string;
  cx_ip: string | null;
  is_cx_risky: boolean | null;
  payment_channel: string;
}

// Transactions List Interface
export interface TransactionsType {
  transactions: TransactionType[];
}

// Payout Interface
export interface PayoutType {
  id: string;
  amount: number;
  status: string;
  bank_account: string;
  utr: string;
  timestamp: string;
}

// Payouts List Interface
export interface PayoutsType {
  payouts: PayoutType[];
}

// Communication Interface
export interface CommunicationType {
  subject: string;
  sender_id: string;
  content: string;
  created_at: string;
  id: string;
  type: string;
  receiver_id: string;
  timestamp: string;
}

// Communications List Interface
export interface CommunicationsType {
  communications: CommunicationType[];
}

// Payment Channel Interface
export interface PaymentChannelType {
  name: string;
  type: string;
  created_at: string;
  status: string;
  id: string;
  merchant_id: string;
  added_on: string;
}

// Payment Channels List Interface
export interface PaymentChannelsType {
  payment_channels: PaymentChannelType[];
}

// ------------------------------------------------------------------------------------------------
// Case Management types

// Case Investigation Interface
export interface CaseInvestigationType {
  id: string;
  investigation_id: string;
  merchant_id: string;
  merchant_name: string;
  merchant_email: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  assignee_Name: string;
  assignee_Email: string;
  case_number: string;
  created_at: string;
  last_updated: string;
  sla_deadline: string;
}

// Case Investigations List Interface
export interface CaseInvestigationListType {
  investigations: CaseInvestigationType[];
}

// ... existing code ...

// Investigator Interface
export interface InvestigatorType {
  name: string;
  email: string;
  id: string;
  expertise: string;
  SLA_adherence_percentage: number;
  current_caseload: number;
  created_at: string;
}

// Investigators List Interface
export interface InvestigatorsListType {
  investigators: InvestigatorType[];
}

// Investigation Reference Interface
export interface InvestigationReference {
  investigation_id: string;
  case_number: string;
}

// below are Investigation Hub types
export interface caseNote {
  title: string;
  timestamp: string;
  user: string;
  description: string;
}


// Case Event Interface
export interface CaseEvent {
  case_event_id: string;
  description: string;
  timestamp: string;
  user: string;
  content: string;
  type: string;
  meta_data: CaseEventMetadata[];
}

// Case Event Metadata Interface
export interface CaseEventMetadata {
  oldStatus: string;
  id: string;
  documentType: string;
  created_at: string;
  case_event_id: string;
  channel: string;
  newStatus: string;
  communicationType: string;
}

// Case Events Response Interface
export interface CaseEventsListType {
  case_events: CaseEvent[];
}

export interface CaseAssigneeInfo {
  assignee_Name: string;
  assignee_Email: string;
  status: string;
}

// Email Communication Item Interface
export interface EmailCommunicationItem {
  sender: string;
  receiver: string;
  subject: string;
  content: string;
  timestamp: string;
  chat_id: string;
}

// Email Communications List Interface
export interface EmailCommunicationList {
  email_communication: EmailCommunicationItem[];
}

/// Chat types

export interface activeChatIDType {
  id: string;
  title: string;
  lastchated: string;
  created_at: string;
}

export interface ChatHistoryItem {
  chat_id: string;
  message_id: string;
  message: string;
  id: string;
  writer: string;
  created_at: string;
}

export interface ChatDetailedMessage {
  chat_id: string;
  id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  visualization: boolean;
  merchant_id: string;
  sender: 'user' | 'assistant';
  message: {
    message: string;
    sources?: string[];
  } | string;  // Allow for string message format in case API changes
  meta_data: any;
}

// Digital Information Interface from here

// Server Details Interface
interface ServerDetails {
  ip_address: string;
  country: string;
  owner: string;
}

// Domain Details Interface
interface DomainDetails {
  age: string;
  registrar: string;
  owner_email: string | null;
  admin_contact: string | null;
  privacy_protection: boolean;
}

// Domain Information Interface
interface DomainInformation {
  domain: string;
  server_details: ServerDetails;
  domain_details: DomainDetails;
  business_model: string;
}

// Website Monitoring Entry Interface
interface WebsiteMonitoringEntry {
  timestamp: string;
  status_code: string;
  response_time_ms: string;
  is_active: boolean;
  error: string | null;
}

// Keyword Interface
interface Keyword {
  keyword: string;
  frequency: number;
}

// Contact Information Entry Interface
interface ContactInformationEntry {
  type: string;
  value: string;
}

// Website Content Interface
interface WebsiteContent {
  keywords: Keyword[];
  contact_information: ContactInformationEntry[];
}

// Review Summary Interface
interface ReviewSummary {
  sentiment: string;
  summary: string;
}

// Detailed Review Interface
interface DetailedReview {
  source: string;
  title: string;
  summary: string;
  content: string;
  url: string;
}

// Reviews Interface
interface Reviews {
  summary: ReviewSummary[];
  detailed_reviews: DetailedReview[];
}

// Product Detail Interface
interface ProductDetail {
  name: string;
  summary: string;
  price: string;
  industry_and_location: string;
}

// Products and Services Interface
interface ProductsAndServices {
  overview: { description: string }[];
  details: ProductDetail[];
}

// Risk Incident Interface
interface RiskIncident {
  title: string;
  summary: string;
  content: string;
  time: string;
  link: string;
}

// Risk and News Interface
interface RiskAndNews {
  risk_summary: { summary: string; sentiment: string }[];
  incidents: RiskIncident[];
}

// Main Digital Information Interface
export interface DigitalInformationType {
  digital_information: {
    domain_information: DomainInformation;
    website_monitoring: WebsiteMonitoringEntry[];
    website_content: WebsiteContent;
    reviews: Reviews;
    products_and_services: ProductsAndServices;
    risk_and_news: RiskAndNews;
  }
}

// ------------------------------------------------------------------------------------------------
// Rules repo types

// ... existing code ...

// Base Metric Condition Interface
export interface BaseMetricCondition {
  metric_name: string;
  operation: string;
  value: string | number | boolean;
  type: 'numeric' | 'string' | 'boolean';
}

// Composite Metric Condition Interface
export interface CompositeMetricCondition {
  operator: 'AND' | 'OR';
  conditions: (BaseMetricCondition | CompositeMetricCondition)[];
}

// Metric Equation Interface
export interface MetricEquation {
  operator: 'AND' | 'OR';
  conditions: (BaseMetricCondition | CompositeMetricCondition)[];
}

// Rule Interface
export interface Rule {
  rule_code: string;
  rule_name: string;
  rule_description: string;
  rule_status: boolean;
  rule_type: string;
  rule_severity: "Low" | "Medium" | "High" | "Critical";
  fraud_type: string;
  metric_equation: MetricEquation;
  id?: string;
  version?: number;
  created_at?: string;
  updated_at?: string;
  created_by?: string;
  updated_by?: string;
  raw_rule?: any;
}

// Main Rules Interface
export interface RulesType {
  data: Rule[];
}

// Metric Interface
export interface Metric {
  metric_name: string;
  metric_description: string;
}

// Main Metrics Interface
export interface MetricsType {
  data: Metric[];
}

// LLM Metric Interface
export interface LlmMetric {
  metric_name: string;
  metric_description: string;
  severity: 'Low' | 'Medium' | 'High' | 'Critical';
  active_status: boolean;
  last_updated: string;
  last_updated_by: string;
}

// Main LLM Metrics Interface
export interface LlmMetricsType {
  data: LlmMetric[];
}

export type MessageMode = 'chat' | 'websearch' | 'document';

export interface ColumnStatistics {
  type: 'numeric' | 'categorical';
  nullPercentage: number;
  numericStats?: {
    min: number;
    max: number;
    avg: number;
  };
  categoricalStats?: {
    valueCounts: Array<{
      value: string;
      count: number;
      percentage: number;
    }>;
  };
}