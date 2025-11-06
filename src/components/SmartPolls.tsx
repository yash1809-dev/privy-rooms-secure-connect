import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

const sampleData = [
  { option: "Dark Mode", votes: 58 },
  { option: "Light Mode", votes: 22 },
  { option: "Auto", votes: 31 },
];

export default function SmartPolls() {
  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle>Smart Polls</CardTitle>
        <CardDescription>Visualize results beautifully</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={sampleData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="option" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="votes" fill="hsl(var(--primary))" radius={[6,6,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="flex gap-2">
          <Button size="sm">Vote</Button>
          <Button size="sm" variant="outline">Create Poll</Button>
        </div>
      </CardContent>
    </Card>
  );
}


