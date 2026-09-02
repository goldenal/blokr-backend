import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'crypto';
import axios from 'axios';

type InitializeTransactionResponse = {
  status: boolean;
  message: string;
  data: { authorization_url: string; access_code: string; reference: string };
};

type CreateSubaccountResponse = {
  status: boolean;
  message: string;
  data: { subaccount_code: string };
};

@Injectable()
export class PaystackService {
  private readonly baseUrl = 'https://api.paystack.co';

  constructor(private readonly config: ConfigService) {}

  isConfigured(): boolean {
    const key = this.config.get<string>('PAYSTACK_SECRET_KEY', '');
    return !!key && !key.includes('REPLACE_ME');
  }

  async initializeTransaction(params: {
    email: string;
    amountKobo: number;
    reference: string;
    subaccountCode?: string | null;
  }): Promise<{
    authorizationUrl: string;
    accessCode: string;
    reference: string;
  }> {
    if (!this.isConfigured()) {
      throw new ServiceUnavailableException(
        'Paystack is not configured yet — set PAYSTACK_SECRET_KEY to a real test/live secret key.',
      );
    }

    const secretKey = this.config.getOrThrow<string>('PAYSTACK_SECRET_KEY');
    try {
      const response = await axios.post<InitializeTransactionResponse>(
        `${this.baseUrl}/transaction/initialize`,
        {
          email: params.email,
          amount: params.amountKobo,
          reference: params.reference,
          // 0%-commission model: when the professional has a subaccount configured,
          // settle the full amount directly to them rather than the platform account.
          ...(params.subaccountCode
            ? { subaccount: params.subaccountCode, bearer: 'subaccount' }
            : {}),
        },
        {
          headers: {
            Authorization: `Bearer ${secretKey}`,
            'Content-Type': 'application/json',
          },
        },
      );
      return {
        authorizationUrl: response.data.data.authorization_url,
        accessCode: response.data.data.access_code,
        reference: response.data.data.reference,
      };
    } catch (error) {
      const message = axios.isAxiosError(error)
        ? (error.response?.data as { message?: string } | undefined)?.message
        : undefined;
      throw new ServiceUnavailableException(
        `Paystack initialization failed: ${message ?? 'unknown error'}`,
      );
    }
  }

  async createOrUpdateSubaccount(params: {
    existingSubaccountCode?: string | null;
    businessName: string;
    bankCode: string;
    accountNumber: string;
  }): Promise<{ subaccountCode: string }> {
    if (!this.isConfigured()) {
      throw new ServiceUnavailableException(
        'Paystack is not configured yet — set PAYSTACK_SECRET_KEY to a real test/live secret key.',
      );
    }

    const secretKey = this.config.getOrThrow<string>('PAYSTACK_SECRET_KEY');
    const body = {
      business_name: params.businessName,
      settlement_bank: params.bankCode,
      account_number: params.accountNumber,
      // 0% marketplace commission: the professional keeps 100% of the charge.
      percentage_charge: 0,
    };

    try {
      if (params.existingSubaccountCode) {
        await axios.put(
          `${this.baseUrl}/subaccount/${params.existingSubaccountCode}`,
          body,
          { headers: { Authorization: `Bearer ${secretKey}` } },
        );
        return { subaccountCode: params.existingSubaccountCode };
      }

      const response = await axios.post<CreateSubaccountResponse>(
        `${this.baseUrl}/subaccount`,
        body,
        { headers: { Authorization: `Bearer ${secretKey}` } },
      );
      return { subaccountCode: response.data.data.subaccount_code };
    } catch (error) {
      const message = axios.isAxiosError(error)
        ? (error.response?.data as { message?: string } | undefined)?.message
        : undefined;
      throw new ServiceUnavailableException(
        `Paystack subaccount setup failed: ${message ?? 'unknown error'}`,
      );
    }
  }

  verifyWebhookSignature(
    rawBody: Buffer,
    signature: string | undefined,
  ): boolean {
    if (!signature || !this.isConfigured()) return false;
    const secretKey = this.config.get<string>(
      'PAYSTACK_WEBHOOK_SECRET',
      this.config.getOrThrow<string>('PAYSTACK_SECRET_KEY'),
    );
    const hash = createHmac('sha512', secretKey).update(rawBody).digest('hex');
    return hash === signature;
  }
}
