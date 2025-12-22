import { searchMarketplaceTool } from "./marketplace.tools";
import {
  initiateBookingTool,
  scheduleViewingTool,
} from "./booking.tools";
import { consultEncyclopediaTool, getRealTimeInfoTool } from "./info.tools";
import {
  sendWhatsAppMessageTool,
  sendAppNotificationTool,
  sendEmailNotificationTool,
} from "./messaging.tools";
import { requestTaxiTool, dispatchTaxiTool } from "./taxi.tools";
import { createConsumerRequestTool } from "./consumerRequest.tools";
import { searchLocalPlacesTool, searchEventsTool } from "./discovery.tools";
import {
  getUserProfileTool,
  updateUserProfileTool,
  saveFavoriteItemTool,
  listFavoritesTool,
} from "./user.tools";
import {
  listUserAddressesTool,
  createOrUpdateAddressTool,
  setDefaultAddressTool,
} from "./addressBook.tools";
import {
  listNearbyUsersTool,
  checkInToPlaceTool,
  getCheckInsForPlaceTool,
  fetchVibeMapDataTool,
} from "./socialPresence.tools";
import {
  createItineraryTool,
  addToItineraryTool,
  removeFromItineraryTool,
  getItineraryTool,
  saveItineraryTool,
} from "./itinerary.tools";
import {
  updateBusinessInfoTool,
  updateBusinessAvailabilityTool,
  updateBusinessHoursTool,
  uploadBusinessMediaTool,
  listBusinessLeadsTool,
  respondToLeadTool,
} from "./business.tools";
import {
  orderHouseholdSuppliesTool,
  requestServiceTool,
  searchHousingListingsToolDef,
  createServiceRequestToolDef,
  createOrderToolDef,
  searchPlacesToolDef,
} from "./v1Ops.tools";
import {
  searchRestaurantsToolDef,
  orderFoodToolDef,
  bookServiceToolDef,
  findPharmacyToolDef,
  getNewsToolDef,
  getExchangeRateToolDef,
} from "./v1Consumer.tools";
import {
  getNearbyPlacesTool,
  computeDistanceTool,
  fetchHotspotsTool,
  getAreaInfoTool,
  showDirectionsToolDef,
} from "./geo.tools";

export const ALL_TOOL_DEFINITIONS = [
  searchMarketplaceTool,
  initiateBookingTool,
  consultEncyclopediaTool,
  getRealTimeInfoTool,
  sendWhatsAppMessageTool,
  requestTaxiTool,
  dispatchTaxiTool,
  createConsumerRequestTool,
  scheduleViewingTool,
  searchLocalPlacesTool,
  searchEventsTool,
  getUserProfileTool,
  updateUserProfileTool,
  saveFavoriteItemTool,
  listFavoritesTool,
  listUserAddressesTool,
  createOrUpdateAddressTool,
  setDefaultAddressTool,
  listNearbyUsersTool,
  checkInToPlaceTool,
  getCheckInsForPlaceTool,
  fetchVibeMapDataTool,
  searchHousingListingsToolDef,
  createServiceRequestToolDef,
  createOrderToolDef,
  searchPlacesToolDef,
  createItineraryTool,
  addToItineraryTool,
  removeFromItineraryTool,
  getItineraryTool,
  saveItineraryTool,
  updateBusinessInfoTool,
  updateBusinessAvailabilityTool,
  updateBusinessHoursTool,
  uploadBusinessMediaTool,
  listBusinessLeadsTool,
  respondToLeadTool,
  sendAppNotificationTool,
  sendEmailNotificationTool,
  getNearbyPlacesTool,
  computeDistanceTool,
  fetchHotspotsTool,
  getAreaInfoTool,
  orderHouseholdSuppliesTool,
  requestServiceTool,
  // V1 Consumer Tools
  searchRestaurantsToolDef,
  orderFoodToolDef,
  bookServiceToolDef,
  findPharmacyToolDef,
  getNewsToolDef,
  getExchangeRateToolDef,
  showDirectionsToolDef,
];
