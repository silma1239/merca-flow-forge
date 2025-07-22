import { Link } from 'react-router-dom';
import { XCircle, RefreshCw, ArrowLeft, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function PaymentFailure() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-destructive/5 via-background to-warning/5 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-6">
        <div className="text-center space-y-4">
          <div className="mx-auto w-20 h-20 bg-destructive/20 rounded-full flex items-center justify-center">
            <XCircle className="w-12 h-12 text-destructive" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-destructive mb-2">Payment Failed</h1>
            <p className="text-muted-foreground">
              We couldn't process your payment. Please try again or use a different payment method.
            </p>
          </div>
        </div>

        <Card className="shadow-lg border-destructive/20">
          <CardHeader className="text-center pb-3">
            <CardTitle className="flex items-center justify-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              What happened?
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3 text-sm">
              <p className="text-muted-foreground">
                Common reasons for payment failure:
              </p>
              <ul className="space-y-1 text-muted-foreground pl-4">
                <li>• Insufficient funds in your account</li>
                <li>• Incorrect payment details</li>
                <li>• Bank security restrictions</li>
                <li>• Expired payment method</li>
                <li>• Network connectivity issues</li>
              </ul>
            </div>

            <div className="border-t pt-4 space-y-3">
              <p className="text-sm font-medium">What can you do?</p>
              <div className="space-y-2">
                <Button 
                  onClick={() => window.history.back()}
                  className="w-full"
                  variant="default"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Try Again
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => window.history.back()}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Change Payment Method
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="text-center space-y-2">
          <p className="text-sm text-muted-foreground">
            Still having issues? We're here to help!
          </p>
          <div className="flex gap-2 justify-center">
            <Link to="/">
              <Button variant="outline" size="sm">
                Back to Home
              </Button>
            </Link>
            <Button variant="outline" size="sm">
              Contact Support
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}