"use client";

import { Check, Zap } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";

const plans = [
  {
    name: "Free",
    price: "$0",
    description: "Perfect for getting started.",
    features: [
      "10 recordings / mo",
      "720p resolution",
      "Basic editing",
    ],
    buttonText: "Current Plan",
    current: true,
  },
  {
    name: "Pro",
    price: "$10",
    period: "/mo",
    description: "For professionals.",
    features: [
      "Unlimited recordings",
      "4K resolution",
      "AI features",
      "Priority support",
    ],
    buttonText: "Upgrade Now",
    current: false,
    highlight: true,
  },
];

export default function BillingPage() {
  return (
    <div className="container mx-auto max-w-4xl p-6 lg:p-10 space-y-10">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">Billing</h1>
        <p className="text-muted-foreground">
          Manage your subscription and plans.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {plans.map((plan) => (
          <Card 
            key={plan.name}
            className={`rounded-2xl border-accent/10 flex flex-col ${
              plan.highlight ? "ring-1 ring-primary bg-primary/5 shadow-sm" : "bg-transparent shadow-none"
            }`}
          >
            <CardHeader className="pb-4">
              <CardTitle className="text-xl">{plan.name}</CardTitle>
              <div className="flex items-baseline gap-1 pt-2">
                <span className="text-4xl font-bold">{plan.price}</span>
                {plan.period && <span className="text-sm text-muted-foreground">{plan.period}</span>}
              </div>
            </CardHeader>
            <CardContent className="flex-1 space-y-4">
              <div className="space-y-3">
                {plan.features.map((feature) => (
                  <div key={feature} className="flex items-center gap-2">
                    <Check className="h-3.5 w-3.5 text-primary" />
                    <span className="text-sm text-muted-foreground">{feature}</span>
                  </div>
                ))}
              </div>
            </CardContent>
            <CardFooter className="pt-4 pb-6">
              <Button 
                variant={plan.current ? "secondary" : "default"}
                className="w-full rounded-xl h-10 font-medium"
                disabled={plan.current}
              >
                {plan.buttonText}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
      <Card className="rounded-2xl border-accent/10 bg-accent/5 mt-10">
        <CardContent className="p-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-1 text-center md:text-left">
              <h3 className="text-lg font-bold">Need a custom plan?</h3>
              <p className="text-sm text-muted-foreground">
                Contact us for enterprise-grade solutions and bulk pricing.
              </p>
            </div>
            <Button variant="outline" className="rounded-xl px-8 border-accent/20">
              Contact Sales
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
