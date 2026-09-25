import { supabase } from '../lib/supabase';
import { Vehicle, VehicleOccurrence, User } from '../types';

export const fleetService = {
  async getVehicles(prefeituraId: string): Promise<Vehicle[]> {
    const { data, error } = await supabase
      .from('frota')
      .select('*')
      .eq('prefeituraId', prefeituraId)
      .order('nome', { ascending: true });

    if (error) {
      console.error('Error fetching vehicles:', error);
      throw error;
    }
    return data || [];
  },

  async addVehicle(vehicle: Partial<Vehicle>): Promise<Vehicle> {
    const { data, error } = await supabase
      .from('frota')
      .insert([vehicle])
      .select()
      .single();

    if (error) {
      console.error('Error adding vehicle:', error);
      throw error;
    }
    return data;
  },

  async updateVehicle(id: string, updates: Partial<Vehicle>): Promise<Vehicle> {
    const { data, error } = await supabase
      .from('frota')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating vehicle:', error);
      throw error;
    }
    return data;
  },

  async deleteVehicle(id: string): Promise<void> {
    const { error } = await supabase
      .from('frota')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting vehicle:', error);
      throw error;
    }
  },

  async getOccurrences(vehicleId: string): Promise<VehicleOccurrence[]> {
    const { data, error } = await supabase
      .from('frota_ocorrencias')
      .select('*')
      .eq('frota_id', vehicleId)
      .order('createdAt', { ascending: false });

    if (error) {
      console.error('Error fetching occurrences:', error);
      throw error;
    }
    return data || [];
  },

  async addOccurrence(occurrence: Partial<VehicleOccurrence>): Promise<VehicleOccurrence> {
    const { data, error } = await supabase
      .from('frota_ocorrencias')
      .insert([occurrence])
      .select()
      .single();

    if (error) {
      console.error('Error adding occurrence:', error);
      throw error;
    }

    // Update vehicle status and KM if provided
    if (occurrence.frota_id && occurrence.status_resultado) {
      const vehicleUpdates: any = { status: occurrence.status_resultado };
      if (occurrence.km) {
        vehicleUpdates.km_atual = occurrence.km;
      }
      await this.updateVehicle(occurrence.frota_id, vehicleUpdates);
    }

    return data;
  }
};
