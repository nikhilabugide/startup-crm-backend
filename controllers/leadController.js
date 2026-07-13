import mongoose from 'mongoose';
import Lead from '../models/Lead.js';
import Notification from '../models/Notification.js';
import { successResponse, errorResponse, paginatedResponse } from '../utils/apiResponse.js';

/**
 * Retrieve paginated, filtered, and sorted leads matching the logged-in owner.
 * 
 * @route GET /api/leads
 * @access Private
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 * @param {Function} next - Express next middleware callback.
 */
export const getLeads = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      status,
      search,
      source,
      dateFrom,
      dateTo
    } = req.query;

    if (process.env.NODE_ENV === 'development') {
      console.log(`[getLeads] Querying leads for user ${req.user._id} with params:`, req.query);
    }

    // Build filter object: always include { owner: req.user._id }
    const filter = { owner: req.user._id };

    // Add status filter if provided and not 'All'
    if (status && status !== 'All') {
      filter.status = status;
    }

    // Add source filter if provided and not 'All'
    if (source && source !== 'All') {
      filter.source = source;
    }

    // Add search filter if provided (matches name, company, email, or status using case-insensitive regex)
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { company: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { status: { $regex: search, $options: 'i' } }
      ];
    }

    // Add date range filters on createdAt if dateFrom or dateTo are provided
    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) {
        filter.createdAt.$gte = new Date(dateFrom);
      }
      if (dateTo) {
        filter.createdAt.$lte = new Date(dateTo);
      }
    }

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 20;
    const skipNum = (pageNum - 1) * limitNum;

    const sortField = sortBy || 'createdAt';
    const sortDir = sortOrder === 'desc' ? -1 : 1;

    // Use Lead.find(filter) with sorting, skipping, and limiting
    const leadsPromise = Lead.find(filter)
      .sort({ [sortField]: sortDir })
      .skip(skipNum)
      .limit(limitNum);

    // Run Lead.countDocuments(filter) for pagination total
    const countPromise = Lead.countDocuments(filter);

    // Run both queries concurrently
    const [leads, total] = await Promise.all([leadsPromise, countPromise]);

    if (process.env.NODE_ENV === 'development') {
      console.log(`[getLeads] Found ${leads.length} leads for owner ${req.user._id} (Total matching: ${total})`);
    }

    // Return paginatedResponse with leads array and pagination info
    return paginatedResponse(res, leads, total, pageNum, limitNum);
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[getLeads] Error:', error);
    }
    next(error);
  }
};

/**
 * Create a new lead record associated with the logged-in owner.
 * 
 * @route POST /api/leads
 * @access Private
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 * @param {Function} next - Express next middleware callback.
 */
export const createLead = async (req, res, next) => {
  try {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[createLead] Creating new lead for user ${req.user._id} with data:`, req.body);
    }

    // Create new Lead: { ...body, owner: req.user._id }
    const newLead = await Lead.create({
      ...req.body,
      owner: req.user._id
    });

    // Create a notification for lead creation
    await Notification.create({
      recipient: req.user._id,
      title: 'Lead Created',
      message: `Lead "${newLead.name}" for "${newLead.company}" has been created.`,
      type: 'lead_created',
      leadId: newLead._id
    });

    if (process.env.NODE_ENV === 'development') {
      console.log(`[createLead] Created lead successfully with ID: ${newLead._id}`);
    }

    // Return 201 with the new lead
    return successResponse(res, newLead, 'Lead created successfully', 201);
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[createLead] Error:', error);
    }
    next(error);
  }
};

/**
 * Find a single lead by its ID, verifying owner isolation.
 * 
 * @route GET /api/leads/:id
 * @access Private
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 * @param {Function} next - Express next middleware callback.
 */
export const getLeadById = async (req, res, next) => {
  try {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[getLeadById] Fetching lead ${req.params.id} for user ${req.user._id}`);
    }

    // Find by { _id: req.params.id, owner: req.user._id }
    const lead = await Lead.findOne({
      _id: req.params.id,
      owner: req.user._id
    });

    // If not found: 404 "Lead not found"
    if (!lead) {
      if (process.env.NODE_ENV === 'development') {
        console.log(`[getLeadById] Lead ${req.params.id} not found or user unauthorized`);
      }
      return errorResponse(res, 'Lead not found', 404);
    }

    return successResponse(res, lead, 'Lead retrieved successfully');
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[getLeadById] Error:', error);
    }
    next(error);
  }
};

/**
 * Update a lead by ID, verifying owner isolation and preventing owner reassignment.
 * 
 * @route PUT /api/leads/:id
 * @access Private
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 * @param {Function} next - Express next middleware callback.
 */
export const updateLead = async (req, res, next) => {
  try {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[updateLead] Updating lead ${req.params.id} for user ${req.user._id}`);
    }

    // Do NOT allow changing the owner field
    const { owner, ...updateData } = req.body;

    // Find by { _id: req.params.id, owner: req.user._id } and update
    const updatedLead = await Lead.findOneAndUpdate(
      { _id: req.params.id, owner: req.user._id },
      updateData,
      { new: true, runValidators: true }
    );

    // If not found: 404 "Lead not found"
    if (!updatedLead) {
      if (process.env.NODE_ENV === 'development') {
        console.log(`[updateLead] Lead ${req.params.id} not found or user unauthorized`);
      }
      return errorResponse(res, 'Lead not found', 404);
    }

    // Create a notification for lead update
    await Notification.create({
      recipient: req.user._id,
      title: 'Lead Updated',
      message: `Lead "${updatedLead.name}" details have been updated.`,
      type: 'lead_updated',
      leadId: updatedLead._id
    });

    if (process.env.NODE_ENV === 'development') {
      console.log(`[updateLead] Lead ${req.params.id} updated successfully`);
    }

    return successResponse(res, updatedLead, 'Lead updated successfully');
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[updateLead] Error:', error);
    }
    next(error);
  }
};

/**
 * Update only the status field of a lead, verifying owner isolation.
 * 
 * @route PATCH /api/leads/:id/status
 * @access Private
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 * @param {Function} next - Express next middleware callback.
 */
export const updateLeadStatus = async (req, res, next) => {
  try {
    const { status } = req.body;

    if (process.env.NODE_ENV === 'development') {
      console.log(`[updateLeadStatus] Updating status of lead ${req.params.id} to '${status}' for user ${req.user._id}`);
    }

    // Validate status is a valid enum value
    const validStatuses = ['New', 'Contacted', 'Meeting Scheduled', 'Proposal Sent', 'Won', 'Lost'];
    if (!validStatuses.includes(status)) {
      return errorResponse(
        res,
        `Invalid status value. Allowed values are: ${validStatuses.join(', ')}`,
        400
      );
    }

    // Find and update in one operation: Lead.findOneAndUpdate
    const updatedLead = await Lead.findOneAndUpdate(
      { _id: req.params.id, owner: req.user._id },
      { status },
      { new: true, runValidators: true }
    );

    // If not found: 404 "Lead not found"
    if (!updatedLead) {
      if (process.env.NODE_ENV === 'development') {
        console.log(`[updateLeadStatus] Lead ${req.params.id} not found or user unauthorized`);
      }
      return errorResponse(res, 'Lead not found', 404);
    }

    // Create a notification for lead status change
    await Notification.create({
      recipient: req.user._id,
      title: 'Lead Status Changed',
      message: `Lead "${updatedLead.name}" status updated to "${status}".`,
      type: 'status_changed',
      leadId: updatedLead._id
    });

    if (process.env.NODE_ENV === 'development') {
      console.log(`[updateLeadStatus] Lead status updated successfully for lead ${req.params.id}`);
    }

    return successResponse(res, updatedLead, 'Lead status updated successfully');
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[updateLeadStatus] Error:', error);
    }
    next(error);
  }
};

/**
 * Delete a lead, verifying owner isolation.
 * 
 * @route DELETE /api/leads/:id
 * @access Private
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 * @param {Function} next - Express next middleware callback.
 */
export const deleteLead = async (req, res, next) => {
  try {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[deleteLead] Deleting lead ${req.params.id} for user ${req.user._id}`);
    }

    // Find by { _id: req.params.id, owner: req.user._id }
    const lead = await Lead.findOne({
      _id: req.params.id,
      owner: req.user._id
    });

    // If not found: 404 "Lead not found"
    if (!lead) {
      if (process.env.NODE_ENV === 'development') {
        console.log(`[deleteLead] Lead ${req.params.id} not found or user unauthorized`);
      }
      return errorResponse(res, 'Lead not found', 404);
    }

    // Delete with lead.deleteOne()
    await lead.deleteOne();

    if (process.env.NODE_ENV === 'development') {
      console.log(`[deleteLead] Lead ${req.params.id} deleted successfully`);
    }

    // Return 200 with { message: 'Lead deleted successfully' }
    return successResponse(res, null, 'Lead deleted successfully');
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[deleteLead] Error:', error);
    }
    next(error);
  }
};

/**
 * Retrieve high-level lead statistics for the dashboard StatsCard display.
 * 
 * @route GET /api/leads/stats
 * @access Private
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 * @param {Function} next - Express next middleware callback.
 */
export const getLeadStats = async (req, res, next) => {
  try {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[getLeadStats] Generating stats for user ${req.user._id}`);
    }

    const ownerId = new mongoose.Types.ObjectId(req.user._id);

    const now = new Date();
    // Calculate calendar boundaries in UTC
    const thisMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const lastMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
    const lastMonthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0, 23, 59, 59, 999));

    // Single aggregation query to fetch all required statistics
    const aggregationResult = await Lead.aggregate([
      { $match: { owner: ownerId } },
      {
        $facet: {
          totalLeads: [
            { $count: 'count' }
          ],
          statusBreakdown: [
            { $group: { _id: '$status', count: { $sum: 1 } } }
          ],
          sourceBreakdown: [
            { $group: { _id: '$source', count: { $sum: 1 } } }
          ],
          thisMonthLeads: [
            { $match: { createdAt: { $gte: thisMonthStart } } },
            { $count: 'count' }
          ],
          lastMonthLeads: [
            {
              $match: {
                createdAt: {
                  $gte: lastMonthStart,
                  $lte: lastMonthEnd
                }
              }
            },
            { $count: 'count' }
          ]
        }
      },
      {
        $project: {
          totalLeads: { $ifNull: [{ $arrayElemAt: ['$totalLeads.count', 0] }, 0] },
          thisMonthLeads: { $ifNull: [{ $arrayElemAt: ['$thisMonthLeads.count', 0] }, 0] },
          lastMonthLeads: { $ifNull: [{ $arrayElemAt: ['$lastMonthLeads.count', 0] }, 0] },
          statusBreakdown: {
            $arrayToObject: {
              $map: {
                input: {
                  $filter: {
                    input: '$statusBreakdown',
                    as: 'item',
                    cond: { $ne: ['$$item._id', null] }
                  }
                },
                as: 'sb',
                in: { k: '$$sb._id', v: '$$sb.count' }
              }
            }
          },
          sourceBreakdown: {
            $arrayToObject: {
              $map: {
                input: {
                  $filter: {
                    input: '$sourceBreakdown',
                    as: 'item',
                    cond: { $ne: ['$$item._id', null] }
                  }
                },
                as: 'sb',
                in: { k: '$$sb._id', v: '$$sb.count' }
              }
            }
          },
          wonLeads: {
            $ifNull: [
              {
                $arrayElemAt: [
                  {
                    $map: {
                      input: {
                        $filter: {
                          input: '$statusBreakdown',
                          as: 'item',
                          cond: { $eq: ['$$item._id', 'Won'] }
                        }
                      },
                      as: 'f',
                      in: '$$f.count'
                    }
                  },
                  0
                ]
              },
              0
            ]
          }
        }
      },
      {
        $project: {
          totalLeads: 1,
          statusBreakdown: 1,
          sourceBreakdown: 1,
          thisMonthLeads: 1,
          lastMonthLeads: 1,
          conversionRate: {
            $cond: [
              { $gt: ['$totalLeads', 0] },
              {
                $round: [
                  { $multiply: [{ $divide: ['$wonLeads', '$totalLeads'] }, 100] },
                  1
                ]
              },
              0.0
            ]
          },
          growthRate: {
            $cond: [
              { $gt: ['$lastMonthLeads', 0] },
              {
                $round: [
                  {
                    $multiply: [
                      { $divide: [{ $subtract: ['$thisMonthLeads', '$lastMonthLeads'] }, '$lastMonthLeads'] },
                      100
                    ]
                  },
                  1
                ]
              },
              { $cond: [{ $gt: ['$thisMonthLeads', 0] }, 100.0, 0.0] }
            ]
          }
        }
      }
    ]);

    const stats = aggregationResult[0] || {
      totalLeads: 0,
      statusBreakdown: {},
      conversionRate: 0.0,
      sourceBreakdown: {},
      thisMonthLeads: 0,
      lastMonthLeads: 0,
      growthRate: 0.0
    };

    if (process.env.NODE_ENV === 'development') {
      console.log(`[getLeadStats] Computed stats for user ${req.user._id}:`, stats);
    }

    return successResponse(res, stats, 'Lead statistics retrieved successfully');
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[getLeadStats] Error:', error);
    }
    next(error);
  }
};

/**
 * Aggregate leads grouped by year and month for the last 6 months to display in analytics bar charts.
 * 
 * @route GET /api/leads/monthly-stats
 * @access Private
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 * @param {Function} next - Express next middleware callback.
 */
export const getMonthlyStats = async (req, res, next) => {
  try {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[getMonthlyStats] Fetching monthly stats for user ${req.user._id}`);
    }

    const ownerId = new mongoose.Types.ObjectId(req.user._id);

    // Build the last 6 calendar months (including current month) in order from oldest to newest
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthsList = [];
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
      monthsList.push({
        year: d.getUTCFullYear(),
        monthNum: d.getUTCMonth() + 1, // 1-based index to match Mongo's $month operator
        monthLabel: `${monthNames[d.getUTCMonth()]} ${d.getUTCFullYear()}` // e.g. 'Jan 2025'
      });
    }

    const startDate = new Date(Date.UTC(monthsList[0].year, monthsList[0].monthNum - 1, 1));

    // Aggregate leads grouped by UTC year and month
    const monthlyAggregation = await Lead.aggregate([
      {
        $match: {
          owner: ownerId,
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          total: { $sum: 1 },
          won: {
            $sum: { $cond: [{ $eq: ['$status', 'Won'] }, 1, 0] }
          },
          lost: {
            $sum: { $cond: [{ $eq: ['$status', 'Lost'] }, 1, 0] }
          }
        }
      }
    ]);

    // Map database results into the template list
    const statsMap = {};
    monthlyAggregation.forEach(item => {
      const key = `${item._id.year}-${item._id.month}`;
      statsMap[key] = item;
    });

    // Populate final monthly statistics ensuring zero months are included and conversionRate is calculated
    const finalMonthlyStats = monthsList.map(m => {
      const key = `${m.year}-${m.monthNum}`;
      const dbData = statsMap[key];

      const total = dbData ? dbData.total : 0;
      const won = dbData ? dbData.won : 0;
      const lost = dbData ? dbData.lost : 0;
      const conversionRate = total > 0 ? parseFloat(((won / total) * 100).toFixed(1)) : 0.0;

      return {
        month: m.monthLabel, // e.g. 'Jan 2025'
        total,
        won,
        lost,
        conversionRate
      };
    });

    if (process.env.NODE_ENV === 'development') {
      console.log(`[getMonthlyStats] Monthly stats compiled for user ${req.user._id}:`, finalMonthlyStats);
    }

    // Return array: [{ month: 'Jan 2025', total: 12, won: 4, lost: 2, conversionRate: 33.3 }, ...]
    return successResponse(res, finalMonthlyStats, 'Monthly statistics retrieved successfully');
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[getMonthlyStats] Error:', error);
    }
    next(error);
  }
};

/**
 * Quick search endpoint for autocompletion.
 * Performs a regex search matching a query string against lead name, company, or email.
 * Returns only: _id, name, company, email, and status.
 * Limits results to 5 for optimal performance.
 * 
 * @route GET /api/leads/search
 * @access Private
 * @param {Object} req - Express request object.
 * @param {Object} req.query - Query parameters.
 * @param {String} req.query.q - The query string to search for.
 * @param {Number} [req.query.limit=5] - Number of results to return.
 * @param {Object} res - Express response object.
 * @param {Function} next - Express next middleware callback.
 * @returns {Promise<Response>} JSON response with search results array.
 */
export const searchLeads = async (req, res, next) => {
  try {
    const { q, limit = 5 } = req.query;

    if (process.env.NODE_ENV === 'development') {
      console.log(`[searchLeads] Searching leads for user ${req.user._id} with query: '${q}'`);
    }

    const filter = { owner: req.user._id };

    if (q) {
      filter.$or = [
        { name: { $regex: q, $options: 'i' } },
        { company: { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } },
        { status: { $regex: q, $options: 'i' } }
      ];
    }

    const limitNum = parseInt(limit, 10) || 5;

    const leads = await Lead.find(filter)
      .select('_id name company email status')
      .limit(limitNum);

    if (process.env.NODE_ENV === 'development') {
      console.log(`[searchLeads] Found ${leads.length} matching leads for owner ${req.user._id}`);
    }

    return successResponse(res, leads, 'Leads search results retrieved successfully');
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[searchLeads] Error:', error);
    }
    next(error);
  }
};
