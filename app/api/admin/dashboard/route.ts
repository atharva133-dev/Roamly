import { NextResponse } from 'next/server'
import { enforceRole } from '@/lib/auth/rbac'
import { UserRole } from '@prisma/client'

// Mock data - replace with actual database queries
let mockUsers = [
  { id: 1, name: "John Doe", email: "john@example.com", trips: 5, status: "active", avatar: "JD", lastActive: "2 hours ago", joinDate: "2024-01-15" },
  { id: 2, name: "Jane Smith", email: "jane@example.com", trips: 3, status: "active", avatar: "JS", lastActive: "1 day ago", joinDate: "2024-02-20" },
  { id: 3, name: "Mike Johnson", email: "mike@example.com", trips: 7, status: "inactive", avatar: "MJ", lastActive: "1 week ago", joinDate: "2023-12-10" },
  { id: 4, name: "Sarah Wilson", email: "sarah@example.com", trips: 2, status: "active", avatar: "SW", lastActive: "3 hours ago", joinDate: "2024-03-05" },
  { id: 5, name: "David Brown", email: "david@example.com", trips: 4, status: "active", avatar: "DB", lastActive: "5 hours ago", joinDate: "2024-01-30" },
  { id: 6, name: "Emily Davis", email: "emily@example.com", trips: 6, status: "active", avatar: "ED", lastActive: "1 hour ago", joinDate: "2024-02-15" },
  { id: 7, name: "Chris Lee", email: "chris@example.com", trips: 1, status: "inactive", avatar: "CL", lastActive: "2 weeks ago", joinDate: "2024-03-01" },
  { id: 8, name: "Lisa Chen", email: "lisa@example.com", trips: 8, status: "active", avatar: "LC", lastActive: "30 minutes ago", joinDate: "2023-11-20" }
]

const mockPopularCities = [
  { name: "Paris", value: 35, color: "#8E9C78" },
  { name: "Tokyo", value: 25, color: "#485C11" },
  { name: "New York", value: 20, color: "#C7B697" },
  { name: "London", value: 15, color: "#929292" },
  { name: "Others", value: 5, color: "#DFECC6" }
]

const mockActivities = [
  { activity: "Sightseeing", count: 45 },
  { activity: "Food Tours", count: 32 },
  { activity: "Adventure", count: 28 },
  { activity: "Cultural Tours", count: 22 },
  { activity: "Shopping", count: 18 }
]

const mockUserTrends = [
  { period: "Jan", users: 120 },
  { period: "Feb", users: 180 },
  { period: "Mar", users: 220 },
  { period: "Apr", users: 280 },
  { period: "May", users: 320 },
  { period: "Jun", users: 290 },
  { period: "Jul", users: 350 },
  { period: "Aug", users: 380 }
]

function getDashboardStats() {
  return {
    totalUsers: mockUsers.length,
    activeUsers: mockUsers.filter(user => user.status === 'active').length,
    totalTrips: mockUsers.reduce((sum, user) => sum + user.trips, 0),
    averageTripsPerUser: Math.round(mockUsers.reduce((sum, user) => sum + user.trips, 0) / mockUsers.length),
    monthlyGrowth: 15.2,
    topCity: mockPopularCities[0].name,
    topActivity: mockActivities[0].activity
  }
}

export async function GET() {
  try {
    const { errorResponse } = await enforceRole([UserRole.SUPER_ADMIN]);
    if (errorResponse) return errorResponse;

    return NextResponse.json({
      users: mockUsers,
      popularCities: mockPopularCities,
      activities: mockActivities,
      userTrends: mockUserTrends,
      stats: getDashboardStats()
    })
  } catch (error) {
    console.error('Dashboard API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { errorResponse } = await enforceRole([UserRole.SUPER_ADMIN]);
    if (errorResponse) return errorResponse;

    const body = await request.json()
    const { action, data } = body

    switch (action) {
      case 'updateUser':
        // TODO: Implement user update logic
        return NextResponse.json({ success: true, message: 'User updated successfully' })

      case 'deleteUser':
        // Remove user from mock data
        const userToDelete = data.userId
        mockUsers = mockUsers.filter(user => user.id !== userToDelete)
        return NextResponse.json({
          success: true,
          message: 'User deleted successfully',
          stats: getDashboardStats() // Return updated stats
        })

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Dashboard API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
