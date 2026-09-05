"use client"

import { useState, useEffect } from "react"
import { Search, Filter, SortAsc, HelpCircle, Users, MapPin, Activity, TrendingUp, Loader2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { UserManagement } from "@/components/admin/UserManagement"
import { PopularCitiesChart } from "@/components/admin/PopularCitiesChart"
import { ActivitiesChart } from "@/components/admin/ActivitiesChart"
import { UserTrendsChart } from "@/components/admin/UserTrendsChart"
import { DashboardStats } from "@/components/admin/DashboardStats"
import { toast } from "sonner"

interface User {
  id: number
  name: string
  email: string
  trips: number
  status: "active" | "inactive"
  avatar: string
  lastActive?: string
  joinDate?: string
}

interface CityData {
  name: string
  value: number
  color: string
}

interface ActivityData {
  activity: string
  count: number
  color?: string
}

interface TrendData {
  period: string
  users: number
  growth?: number
}

interface DashboardStats {
  totalUsers: number
  activeUsers: number
  totalTrips: number
  averageTripsPerUser: number
  monthlyGrowth: number
  topCity: string
  topActivity: string
}

interface DashboardData {
  users: User[]
  popularCities: CityData[]
  activities: ActivityData[]
  userTrends: TrendData[]
  stats: DashboardStats
}

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<string>("users")
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [searchTerm, setSearchTerm] = useState<string>("")

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async (): Promise<void> => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/dashboard')
      if (!response.ok) {
        throw new Error('Failed to fetch dashboard data')
      }
      const dashboardData: DashboardData = await response.json()
      setData(dashboardData)
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
      toast.error('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }



  const handleDeleteUser = async (userId: number): Promise<void> => {
    try {
      const response = await fetch('/api/admin/dashboard', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'deleteUser',
          data: { userId }
        })
      })
      
      if (response.ok) {
        toast.success('User deleted successfully')
        fetchDashboardData() // Refresh data
      } else {
        throw new Error('Failed to delete user')
      }
    } catch (error) {
      console.error('Error deleting user:', error)
      toast.error('Failed to delete user')
    }
  }



  const filteredUsers: User[] = data?.users?.filter(user => 
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  ) || []

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#DFECC6' }}>
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" style={{ color: '#000000' }} />
          <p style={{ color: '#000000' }}>Loading dashboard...</p>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#DFECC6' }}>
        <div className="text-center">
          <p className="mb-4" style={{ color: '#485C11' }}>Failed to load dashboard data</p>
          <Button onClick={fetchDashboardData} variant="outline" style={{ borderColor: '#8E9C78', color: '#000000' }}>
            Retry
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#DFECC6' }}>
      <div className="p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold" style={{ color: '#000000' }}>Roamly</h1>
            <p style={{ color: '#929292' }}>Admin Panel</p>
          </div>
        </div>

        {/* Dashboard Stats */}
        <DashboardStats stats={data.stats} />

        {/* Search and Filter Bar */}
        <div className="flex gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4" style={{ color: '#929292' }} />
            <Input
              placeholder="Search bar ......"
              className="pl-10"
              style={{ 
                backgroundColor: '#FFFFFF', 
                borderColor: '#8E9C78',
                color: '#000000',
                borderWidth: '1px'
              }}
              value={searchTerm}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button variant="outline" style={{ borderColor: '#8E9C78', color: '#000000', backgroundColor: '#FFFFFF' }}>
            <Filter className="h-4 w-4 mr-2" />
            Group by
          </Button>
          <Button variant="outline" style={{ borderColor: '#8E9C78', color: '#000000', backgroundColor: '#FFFFFF' }}>
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>
          <Button variant="outline" style={{ borderColor: '#8E9C78', color: '#000000', backgroundColor: '#FFFFFF' }}>
            <SortAsc className="h-4 w-4 mr-2" />
            Sort by...
          </Button>
        </div>

        {/* Main Content - Centered */}
        <div className="max-w-6xl mx-auto">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4" style={{ backgroundColor: '#FFFFFF', border: '1px solid #8E9C78' }}>
              <TabsTrigger 
                value="users" 
                style={{ 
                  backgroundColor: activeTab === 'users' ? '#8E9C78' : 'transparent',
                  color: activeTab === 'users' ? '#FFFFFF' : '#000000'
                }}
              >
                <Users className="h-4 w-4 mr-2" />
                Manage Users
              </TabsTrigger>
              <TabsTrigger 
                value="cities" 
                style={{ 
                  backgroundColor: activeTab === 'cities' ? '#8E9C78' : 'transparent',
                  color: activeTab === 'cities' ? '#FFFFFF' : '#000000'
                }}
              >
                <MapPin className="h-4 w-4 mr-2" />
                Popular cities
              </TabsTrigger>
              <TabsTrigger 
                value="activities" 
                style={{ 
                  backgroundColor: activeTab === 'activities' ? '#8E9C78' : 'transparent',
                  color: activeTab === 'activities' ? '#FFFFFF' : '#000000'
                }}
              >
                <Activity className="h-4 w-4 mr-2" />
                Popular Activities
              </TabsTrigger>
              <TabsTrigger 
                value="analytics" 
                style={{ 
                  backgroundColor: activeTab === 'analytics' ? '#8E9C78' : 'transparent',
                  color: activeTab === 'analytics' ? '#FFFFFF' : '#000000'
                }}
              >
                <TrendingUp className="h-4 w-4 mr-2" />
                User Trends and Analytics
              </TabsTrigger>
            </TabsList>

            <TabsContent value="users" className="mt-6">
              <UserManagement 
                users={filteredUsers}
                onDeleteUser={handleDeleteUser}
              />
            </TabsContent>

            <TabsContent value="cities" className="mt-6">
              <PopularCitiesChart data={data.popularCities} />
            </TabsContent>

            <TabsContent value="activities" className="mt-6">
              <ActivitiesChart data={data.activities} />
            </TabsContent>

            <TabsContent value="analytics" className="mt-6">
              <UserTrendsChart data={data.userTrends} />
            </TabsContent>
          </Tabs>
        </div>

        {/* Help Button */}
        <div className="fixed bottom-6 right-6">
          <Button size="icon" className="w-12 h-12 rounded-full" style={{ backgroundColor: '#8E9C78', color: '#FFFFFF' }}>
            <HelpCircle className="h-6 w-6" />
          </Button>
        </div>
      </div>
    </div>
  )
}
